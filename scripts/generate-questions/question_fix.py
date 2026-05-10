from generate_questions import *
from pathlib import Path
from pydantic import BaseModel, Field
from google import genai
from dotenv import load_dotenv
import json
import os

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_filter_prompt(prompt_text: str, difficulty: int) -> str:
    return f"""
    ### Role
    You are a Data Taxonomy Specialist. Your goal is to ensure that a prompt's "Answer Set" is manageable (under 100 unique entries, ideally around 50).

    ### Task
    1. Analyze the [Original Prompt].
    2. Estimate the number of unique, scientifically recognized answers that exist for that prompt.
    3. Logical Filter:
    - IF the estimated count is > 100: Generate a "Subgroup Prompt" that narrows the scope (e.g., by geography, size, classification, or era) to a set of < 100 unique answers.
    - ELSE: Keep the [Original Prompt] as the "Final Prompt".
    4. Identify the most appropriate category from the available THEMES for the `theme_slug`.
    5. Difficulty should be {difficulty} out of 5, where questions with a lower difficulty have more questions that are well-known by a general audience.

    ### Input
    Original Prompt: {prompt_text}
    Available Themes: {THEMES}

    ### Output Requirement
    Return ONLY a valid JSON object following this structure:
    {{
        "prompt": "The resulting Final Prompt",
        "theme_slug": "The selected theme from the provided enum",
        "estimated_answer_count": integer,
        "difficulty": {difficulty}
    }}

    ### Constraints
    - The `estimated_answer_count` must reflect the count for the "Final Prompt", not the original.
    - The `prompt` must be a direct question or instruction that leads to the answers.
    - The total number of answers for the question should never be lower than 8
    """

class Question_response(BaseModel):
    """
    Used to format the validated question response.
    """
    prompt: str = Field(description="The new question to generate answers")
    theme_slug: str = Field(description="The theme slug", enum=THEMES)
    estimated_answer_count: int = Field(description="The total esmiated numbers of answers for this question")
    difficulty: int | None = Field(default=None, description="Difficulty level of answering the prompt")

def validate_question(question: str, difficulty: int) -> Question_response:
    """
    Return json array schema format for AI output.
    """

    print(f'[DEBUG] Validating question: {question}')

    response = generate_content_with_retry(
        get_filter_prompt(question, difficulty),
        Question_response.model_json_schema(),
        MODEL_NAME
    )

    log_response(response)
    response_data = json.loads(response.text)
    return Question_response.model_validate(response_data)

def get_questions_from_json(json_file_path: str) -> list[Question]:
    """
    Given a json file formated with "prompt" storing the question text,
    returns a string list of these questions
    """
    try:
        with open(json_file_path, "r") as file:
            questions = json.load(file)
            
        # print(questions)
        return questions

    except json.JSONDecodeError as e:
        print(f"[Error] Invalid JSON format in {json_file_path}: {e}")
        return []
    except FileNotFoundError:
        print(f"[ERROR] File not found: {json_file_path}")
        return []
    

def generate_validated_batch(json_file_path: str) -> list[Question_response]:
    """
    Returns a list of corrected questions given the old json file questions
    """
    new_questions = []
    old_questions = get_questions_from_json(json_file_path)
    for question in old_questions:
        new_questions.append(validate_question(question['prompt'], question['difficulty']))
    
    # for i in range(min(len(old_questions), len(new_questions))):
    #     print(f"{old_questions[i]} => {new_questions[i]}")
    return new_questions


def get_answer_prompt(questions: list[Question_response], theme: str):

    return f"""
    You are a specialized Knowledge Engineer and Taxonomic Researcher. Your task is to generate a JSON array of answers for specific trivia prompts with absolute factual accuracy and structural integrity.

    Theme Slug: "{theme}"

    ### CRITICAL RULES FOR DATA INTEGRITY:
    1.  **Strict Categorical Membership:** Every answer must strictly belong to the category defined by the prompt. 
        - If the prompt asks for "New World Monkeys," you MUST verify they are Platyrrhines (from the Americas). Do NOT include Old World monkeys (macaques, baboons), birds, or anatomical terms.
        - If the prompt asks for "Dogs from Germany," you MUST verify the breed's country of origin is Germany.
    
    2.  **Entity Uniqueness & De-duplication:** 
        - Each answer object must represent a unique entity. 
        - Perform a "Collision Check": Ensure no `display_text` is repeated and no string appears in more than one `variants` array.
        - Combine synonymous entities into one object (e.g., "Poodle" and "Caniche" are one entry).

    3.  **Scientific Accuracy:** 
        - Use the most common "Common Name" for `display_text`.
        - Always include the Scientific Name (Latin name) in the `variants` array for biological prompts.

    4.  **Quantity vs. Quality:** 
        - Aim for exhaustiveness, but **never sacrifice accuracy for count.**
        - There should be at least 8 valid answers.
        - If a category has 100+ valid members, provide the top 100.
        - If a category only has 12 valid members (e.g., "Months of the Year"), provide exactly 12. 
        - DO NOT invent "filler" answers or include "related" items that don't meet the prompt criteria just to reach a higher number.

    5.  **Popularity Ranking:** 
        - Rank 1 is the most "household name" answer. 
        - The final ranks should be "expert-level" obscure facts that are still technically correct.

    6.  **No Alpha-Numeric Restrictions on Display Text:** 
        - Use proper capitalization and punctuation (e.g., "Cavalier King Charles Spaniel").

    7. **Same Difficulties**
        - Each newly generated question MUST be exactly the same as the orginal question. 

    ### OUTPUT FORMAT:
    Return ONLY a JSON array of objects with this structure:
    {{
      "prompt": "The original question string",
      "theme_slug": "{theme}",
      "difficulty": (1-5, the same as the original input question)
      "answer_count_cache": <total number of items in the answers array>,
      "answers": [
        {{
          "display_text": "Common Name",
          "variants": ["Scientific Name", "Alternative Name", "Shortened Name", "Archaic Name"],
          "popularity_rank": 1
        }}
      ]
    }}

    ### FINAL STEP BEFORE OUTPUT:
    Scan your list. If the prompt is "New World Monkeys," and you see "Macaque" (Old World) or "Conure" (Bird), delete them and replace them with valid members like "Uakari" or "Muriqui."

    Input Questions:
    {str([q.prompt for q in questions])}

    Questions Respective Difficulties:
    {str([q.difficulty for q in questions])}
    """

def get_array_schema():
    # Get the full schema with all definitions (excluding difficulty)
    question_schema = Question.model_json_schema(mode='serialization')
    definitions = question_schema.get('$defs', {})
    
    # Resolve $ref references by inlining definitions
    def resolve_refs(obj, defs):
        """Recursively resolve $ref references in schema"""
        if isinstance(obj, dict):
            if '$ref' in obj:
                ref_path = obj['$ref']
                if ref_path.startswith('#/$defs/'):
                    def_name = ref_path.split('/')[-1]
                    return defs.get(def_name, obj)
            return {k: resolve_refs(v, defs) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [resolve_refs(item, defs) for item in obj]
        return obj
    
    # Create resolved question schema without $refs (excluding difficulty)
    resolved_question_schema = resolve_refs(
        {k: v for k, v in question_schema.items() if k != '$defs'},
        definitions
    )
    
    # Create array schema
    array_schema = {
        "type": "array",
        "items": resolved_question_schema,
    }

    return array_schema

def generate_answers(batch_size: int, questions: list[Question_response], file_out: str, theme: str) -> None:

    # Clear file_out
    with open(file_out, 'w'):
        pass
    
    # Generate answers for <batch_size> questions at a time
    question_list = []
    for i in range(0, len(questions), batch_size):
        question_batch = questions[i: min(i + batch_size, len(questions))]
        print(f"[DEBUG] Generating response for questions: {[q.prompt for q in question_batch]}")
        response = generate_content_with_retry(get_answer_prompt(question_batch, theme), get_array_schema(), MODEL_NAME)
        log_response(response)
        generated_questions = json.loads(response.text)
        
        # Validate answer counts
        for q in generated_questions:
            answer_count = len(q.get('answers', []))
            if answer_count < 8:
                print(f"[WARNING] Question '{q.get('prompt')}' has only {answer_count} answers (minimum 8 required). Retrying...")
                # Retry this question with stricter prompt
                retry_response = generate_content_with_retry(
                    get_answer_prompt([Question_response.model_validate(q)], theme) + "\n\nIMPORTANT: This question MUST have at least 8 answers.",
                    get_array_schema(),
                    MODEL_NAME
                )
                log_response(retry_response)
                retry_questions = json.loads(retry_response.text)
                if retry_questions:
                    q_data = retry_questions[0]
                    if len(q_data.get('answers', [])) >= 8:
                        question_list.append(q_data)
                    else:
                        print(f"[ERROR] Question '{q.get('prompt')}' still has insufficient answers after retry. Skipping.")
                else:
                    print(f"[ERROR] Failed to generate answers for '{q.get('prompt')}'. Skipping.")
            else:
                question_list.append(q)
    
    # Add new questions to file_out
    with open(file_out, 'a') as f:
        json.dump(question_list, f, indent=2)
    print("[DEBUG] Finished generating answers")


def generate_answers_from_file(file_input: str, dir_output: str):
    validated_questions = generate_validated_batch(file_input)

    question_list = []
    theme = ""
    for question in validated_questions:
        question_list.append(question)
        theme = question.theme_slug

    # print(question_list)

    # get file name from input file
    filename = os.path.basename(file_input)
    file_output = os.path.join(dir_output, filename)

    generate_answers(5, question_list, file_output, theme)

if __name__ == "__main__":

    # file_input = 'results/test/questions_INTERNET.json'
    # file_output = 'results/filtered/questions_INTERNET.json'

    print("Enter input json file/directory location: (eg. 'results/questions_ANIMALS.json' or just 'results' for the directory)")
    input_path_str = input()
    print("Enter output json directory location: (WARNING: This may override files in the directory)")
    dir_output = input()

    if not Path(dir_output).is_dir:
        print("[ERROR] Enter valid output directory.")
        sys.exit(0)

    input_path = Path(input_path_str)
    if input_path.is_file():
        generate_answers_from_file(input_path, dir_output)
    elif input_path.is_dir():
        for file in input_path.iterdir():
            if file.is_file() and file.suffix == ".json":
                generate_answers_from_file(file, dir_output)
    else:
        print("[ERROR] Input path does not exist or is a special type (link/device)")