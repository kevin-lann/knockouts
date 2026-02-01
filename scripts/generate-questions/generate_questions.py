from google import genai
from google.genai import types
from dotenv import load_dotenv
import os
import sys
import json
from ai import get_system_prompt, Question
from constant import THEMES
load_dotenv()

MODEL_NAME = "gemini-2.5-flash-lite"

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def log_response(response: types.GenerateContentResponse) -> None:
    """
    Log the response from the API.
    """
    # Log token usage
    try:
        if hasattr(response, 'usage_metadata'):
            usage = response.usage_metadata
            
            # Get all available token count fields
            prompt_tokens = getattr(usage, 'prompt_token_count', None)
            candidates_tokens = getattr(usage, 'candidates_token_count', None)
            total_tokens = getattr(usage, 'total_token_count', None)
            
            # Check for cached tokens (if using context caching)
            cached_content_token_count = getattr(usage, 'cached_content_token_count', None)
            
            token_info = []
            if prompt_tokens is not None:
                token_info.append(f"Prompt: {prompt_tokens}")
            if candidates_tokens is not None:
                token_info.append(f"Output: {candidates_tokens}")
            if cached_content_token_count is not None:
                token_info.append(f"Cached: {cached_content_token_count}")
            if total_tokens is not None:
                token_info.append(f"Total: {total_tokens}")
            
            if token_info:
                print(f"[RESOLVER] Token usage - {', '.join(token_info)}")
                
            else:
                if hasattr(usage, '__dict__'):
                    print(f"[RESOLVER] Usage metadata: {usage.__dict__}")
                else:
                    print(f"[RESOLVER] Usage metadata: {usage}")
        elif hasattr(response, 'usage'):
            # Fallback: try direct usage attribute
            usage = response.usage
            print(f"[RESOLVER] Token usage: {usage}")
        else:
            # Try accessing via response object directly
            if hasattr(response, 'prompt_token_count'):
                print(f"[RESOLVER] Prompt tokens: {response.prompt_token_count}")
            if hasattr(response, 'candidates_token_count'):
                print(f"[RESOLVER] Candidates tokens: {response.candidates_token_count}")
            if hasattr(response, 'total_token_count'):
                print(f"[RESOLVER] Total tokens: {response.total_token_count}")
    except Exception as e:
        print(f"[RESOLVER] Could not extract token usage: {e}")
        print(f"[RESOLVER] Response type: {type(response)}")
        if hasattr(response, '__dict__'):
            print(f"[RESOLVER] Response attributes: {list(response.__dict__.keys())}")


def get_question_schema_excluding_difficulty():
    """Get Question schema without difficulty field to save tokens."""
    schema = Question.model_json_schema(mode='serialization')
    # Remove difficulty from properties if it exists
    if 'properties' in schema and 'difficulty' in schema['properties']:
        schema['properties'].pop('difficulty')
    # Also remove from required if present
    if 'required' in schema and 'difficulty' in schema['required']:
        schema['required'].remove('difficulty')
    return schema

def generate_questions(theme: str, difficulty: int, count: int = 1) -> list[Question]:
    """
    Generate one or more questions for the given theme and difficulty.
    
    Args:
        theme: Theme slug (e.g., 'MOVIES_AND_TV')
        difficulty: Difficulty level (1-5)
        count: Number of questions to generate (default: 1)
    
    Returns:
        List of Question objects
    """
    questions = []
    prompt = get_system_prompt(theme, difficulty, count)
    
    # For multiple questions, use array schema
    if count > 1:
        # Get the full schema with all definitions (excluding difficulty)
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
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=array_schema,
            )
        )
        log_response(response)
        response_data = json.loads(response.text)
        for q_data in response_data:
            question = Question.model_validate(q_data)
            question.answer_count_cache = len(question.answers)
            questions.append(question)
    else:
        # Single question
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=get_question_schema_excluding_difficulty(),
            )
        )
        log_response(response)
        response_data = json.loads(response.text)
        question = Question.model_validate(response_data)
        question.answer_count_cache = len(question.answers)
        questions.append(question)
    
    return questions

if __name__ == "__main__":
    if (len(sys.argv) > 3 or len(sys.argv) < 1 
        or sys.argv[1] not in ['all', 'test'] 
        or sys.argv[2] not in THEMES ):
        print("Usage: python3.11 generate_questions.py <mode=all|test> <theme> <difficulty> [count]")
        sys.exit(1)
    
    mode = sys.argv[1]
    theme = sys.argv[2]

    difficulty_to_count = {
        # 1: 100,
        # 2: 50,
        # 3: 25,
        # 4: 10,
        # 5: 5,
        # Test counts
        1: 3,
        2: 3,
        3: 3,
        4: 3,
        5: 3,
    }

    final_questions = []

    if mode == 'all':
        print(f"Generating {sum(difficulty_to_count.values())} questions for theme {theme}")
        for difficulty in [1, 2, 3, 4, 5]:
            print(f"Generating {difficulty_to_count[difficulty]} questions for difficulty {difficulty}")
            questions = generate_questions(theme, difficulty, difficulty_to_count[difficulty])
            questions_with_difficulty = [
                question.model_copy(update={'difficulty': difficulty})
                for question in questions
            ]
            final_questions.extend(questions_with_difficulty)

        print(f"Generated {len(final_questions)} questions")

        # export as json file
        with open(f"results/questions_{theme}.json", "w") as f:
            json.dump([q.model_dump() for q in final_questions], f, indent=2)

        print(f"Generated {len(final_questions)} questions and saved to results/questions_{theme}.json")

    else:
        difficulty = int(sys.argv[3]) if len(sys.argv) > 3 else None # optional
        count = int(sys.argv[4]) if len(sys.argv) > 4 else 1 # optional
        
        final_questions = generate_questions(theme, difficulty, count)
        if difficulty is not None:
            final_questions = [
                q.model_copy(update={'difficulty': difficulty})
                for q in final_questions
            ]
        for question in final_questions:
            print(json.dumps(question.model_dump(), indent=2))
        
        print(f"Generated {len(final_questions)} questions")
        
        # export as json file
        with open(f"results/questions_{theme}_{difficulty}_{count}.json", "w") as f:
            json.dump([q.model_dump() for q in final_questions], f, indent=2)
        
        print(f"Generated {len(final_questions)} questions and saved to results/questions_{theme}_{difficulty if difficulty else ''}.json")
    



    
