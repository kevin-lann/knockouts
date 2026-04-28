from generate_questions import *
from google import genai
from dotenv import load_dotenv
import json
import os

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_filter_prompt(prompt_text: str) -> str:
    return f"""
    ### Role
    You are a Data Taxonomy Specialist. Your goal is to ensure that a prompt's "Answer Set" is manageable (under 100 unique entries).

    ### Task
    1. Analyze the [Original Prompt].
    2. Estimate the number of unique, scientifically recognized answers that exist for that prompt.
    3. Logical Filter:
    - IF the estimated count is > 100: Generate a "Subgroup Prompt" that narrows the scope (e.g., by geography, size, or diet) to a set of < 100 unique answers (preferably around 50 unique answers).
    - ELSE: Return the [Original Prompt] exactly as written.

    ### Input
    Original Prompt: {prompt_text}

    ### CRITICAL: the output MUST follow this format
    - Estimated Count: [Number]
    - Final Prompt: [Your resulting prompt]
    - Estimated Count of Final Prompt: [Number]
    """


def get_array_schema():
    """
    Return json array schema format for AI output.
    """
    question_schema = get_question_schema_excluding_difficulty()
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

def generate_text_content_with_retry(prompt: str, model_name: str) -> types.GenerateContentResponse:
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return client.models.generate_content(
                model=model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="text/plain",
                    max_output_tokens=MAX_OUTPUT_TOKENS,
                )
            )
        except Exception as error:
            last_error = error
            if not is_retryable_error(error) or attempt == MAX_RETRIES:
                raise
            delay_seconds = RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1))
            print(
                f"[RESOLVER] Request failed with {error}. "
                f"Retrying in {delay_seconds:.1f}s ({attempt}/{MAX_RETRIES})"
            )
            time.sleep(delay_seconds)

    raise RuntimeError(f"Request failed after retries: {last_error}")

def process_new_prompt(response) -> str:
    """
    Check for prompt formatting as such:

    - Estimated Count: 500
    - Final Prompt: Name a type of non-human primate found in Madagascar.
    - Estimated Count of Final Prompt: 50

    Return the final prompt on success otherwise the empty string, ""
    """
    lines = response.text.split('\n')
    prompt = ""

    if len(lines) > 1:
        prompt_line = lines[1].split()
        if prompt_line[0] == "-" and prompt_line[1] == "Final" and prompt_line[2] == "Prompt:":
            prompt = " ".join(prompt_line[3:])
            return prompt
    return ""

def get_answer_prompt(questions: list, theme: str):

    return f"""
    You are an expert trivia researcher and data integrity assistant. Your goal is to convert questions into a highly detailed, exhaustive JSON structure.

    Task: Generate a JSON array of objects based on the input questions.
    Theme Slug: "{theme}"

    Critical Instructions for "Answers" Array:
    1. EXHAUSTIVE DEPTH: For each question, do not just provide the obvious answers. You must brainstorm every possible valid answer, including obscure, niche, and "long-tail" responses. 
    2. TARGET QUANTITY: Aim for as many answers as logically exist for the prompt. If a prompt has 50 possible answers, provide all 50. If it has hundreds, provide the top 100. Do NOT stop at 10 or 20 unless that is the physical limit of the category.
    3. ANSWER FORMAT STANDARDIZATION: DO NOT include any non alpha-numeric characters in the answer name and the display_text for each answer should be the most commonly known name.
    3. NO TRUNCATION: Never use "..." or "etc." Every answer must be a discrete object in the array.
    4. VARIANT RICHNESS: For every answer, include a "variants" array containing:
       - Synonyms.
       - Plural/Singular forms.
       - Scientific vs. Common names.
    5. POPULARITY RANKING: Rank 1 is the most "obvious" answer. Higher ranks (50+) should be the most obscure answers that only an expert would know.
    6. DIFFICULTY SCALING: 1 (everyone knows all answers) to 5 (only experts can name more than a few).

    Output Format:
    Return ONLY a JSON array of objects with this structure:
    {{
    "prompt": <question string>,
    "theme_slug": "{theme}",
    "difficulty": <1-5>,
    "answer_count_cache": <total number of items in the answers array>,
    "answers": [
        {{
        "display_text": "Main Answer Name",
        "variants": ["alt name", "misspelling", "shortened version"],
        "popularity_rank": 1
        }}
    ]
    }}

    Input Questions:
    {str(questions)}
    """


if __name__ == "__main__":

    # response = generate_text_content_with_retry(prompt, MODEL_NAME)

    # log_response(response)

    # print(response.text)

    json_list = []
    with open('results/test/questions_INTERNET.json', 'r') as file:
        json_list = json.load(file)

    prompts = [item['prompt'] for item in json_list]
    new_prompts = []

    print(prompts)

    for prompt_text in prompts:

        text_content = generate_text_content_with_retry(get_filter_prompt(prompt_text), MODEL_NAME)
        
        print()
        log_response(text_content)
        print(prompt_text)
        print(text_content.text)

        new_prompts.append(process_new_prompt(text_content))
    
    print(new_prompts)

    response = generate_content_with_retry(get_answer_prompt(new_prompts, "ANIMALS"), get_array_schema(), MODEL_NAME)

    log_response(response)
    # print(response.text)

    output_location = 'results/test/filtered/questions_ANIMALS.json'

    with open(output_location, 'w') as file:
        json.dump(json.loads(response.text), file, indent=4)

    print(f"File saved to: {output_location}")
