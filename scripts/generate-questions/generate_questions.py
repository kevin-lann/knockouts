from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from dotenv import load_dotenv
import os
import sys
import json
import time
import re
from difflib import SequenceMatcher
from ai import get_system_prompt, Question
from constant import THEMES
load_dotenv()

MODEL_NAME = "gemini-2.5-flash-lite"
MAX_QUESTIONS_PER_REQUEST = 10
MAX_OUTPUT_TOKENS = int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "65536"))
MAX_RETRIES = int(os.getenv("GEMINI_MAX_RETRIES", "5"))
RETRY_BASE_DELAY_SECONDS = float(os.getenv("GEMINI_RETRY_BASE_DELAY_SECONDS", "2"))
MAX_BATCH_ATTEMPTS = int(os.getenv("GEMINI_MAX_BATCH_ATTEMPTS", "8"))
PROMPT_SIMILARITY_THRESHOLD = float(os.getenv("PROMPT_SIMILARITY_THRESHOLD", "0.9"))

DIFFICULTY_TO_ANSWER_RANGE = {
    1: (15, 100),
    2: (10, 80),
    3: (7, 55),
    4: (4, 35),
    5: (2, 25),
}


difficulty_to_count = {
    1: 120,
    2: 60,
    3: 30,
    4: 15,
    5: 8,
}

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

def is_retryable_error(error: Exception) -> bool:
    if not isinstance(error, genai_errors.APIError):
        return False
    status = getattr(error, 'status', None)
    status_code = getattr(error, 'status_code', None)

    if isinstance(status, int):
        status_code = status
    elif isinstance(status, str) and status.isdigit():
        status_code = int(status)

    if status_code in [429, 500, 502, 503, 504]:
        return True

    # Fallback for SDK variants that only expose formatted exception text
    error_text = str(error)
    return any(code in error_text for code in ['429', '500', '502', '503', '504'])

def generate_content_with_retry(prompt: str, response_schema: dict, model_name: str) -> types.GenerateContentResponse:
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return client.models.generate_content(
                model=model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_json_schema=response_schema,
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

def save_questions_to_file(file_path: str, questions: list[Question]) -> None:
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w") as f:
        json.dump([q.model_dump() for q in questions], f, indent=2)

def normalize_prompt_key(prompt: str) -> str:
    lowered = prompt.lower().strip()
    lowered = re.sub(r"[^a-z0-9\s]", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered)
    return lowered.strip()

def is_prompt_unique(
    prompt: str,
    seen_prompt_keys: set[str],
    seen_prompt_key_list: list[str]
) -> bool:
    normalized_prompt = normalize_prompt_key(prompt)
    if normalized_prompt in seen_prompt_keys:
        return False

    for existing_prompt in seen_prompt_key_list:
        similarity = SequenceMatcher(None, normalized_prompt, existing_prompt).ratio()
        if similarity >= PROMPT_SIMILARITY_THRESHOLD:
            return False
    return True

def is_question_difficulty_valid(question: Question, difficulty: int) -> bool:
    if difficulty not in DIFFICULTY_TO_ANSWER_RANGE:
        return True
    answer_count = len(question.answers)
    min_answers, max_answers = DIFFICULTY_TO_ANSWER_RANGE[difficulty]
    return min_answers <= answer_count <= max_answers

def generate_questions(
    theme: str,
    difficulty: int,
    count: int = 1,
    avoid_prompts: list[str] | None = None
) -> list[Question]:
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

    prompt = get_system_prompt(theme, difficulty, count, avoid_prompts)
    
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
        response = generate_content_with_retry(prompt, array_schema, MODEL_NAME)
        log_response(response)
        response_data = json.loads(response.text)
        for q_data in response_data:
            question = Question.model_validate(q_data)
            question.answer_count_cache = len(question.answers)
            questions.append(question)
    else:
        # Single question
        response = generate_content_with_retry(
            prompt,
            get_question_schema_excluding_difficulty(),
            "gemini-2.5-flash"
        )
        log_response(response)
        response_data = json.loads(response.text)
        question = Question.model_validate(response_data)
        question.answer_count_cache = len(question.answers)
        questions.append(question)
    
    return questions

def generate_constrained_batch(
    theme: str,
    difficulty: int,
    count: int,
    seen_prompt_keys: set[str],
    seen_prompt_key_list: list[str],
    seen_prompts_for_context: list[str]
) -> tuple[list[Question], bool]:
    accepted_questions: list[Question] = []
    local_seen_keys: set[str] = set()
    local_seen_key_list: list[str] = []
    max_request_count = min(MAX_QUESTIONS_PER_REQUEST, count)

    attempts = 0
    while len(accepted_questions) < count and attempts < MAX_BATCH_ATTEMPTS:
        remaining = count - len(accepted_questions)
        request_count = min(max_request_count, remaining)
        avoid_prompts = seen_prompts_for_context + [q.prompt for q in accepted_questions]

        try:
            generated_questions = generate_questions(
                theme,
                difficulty,
                request_count,
                avoid_prompts
            )
        except json.JSONDecodeError as error:
            # Most common cause is output truncation at token ceiling.
            # Back off request size and retry instead of failing the entire run.
            max_request_count = max(1, request_count // 2)
            attempts += 1
            print(
                f"JSON parse failed for difficulty {difficulty} with request_count={request_count}: {error}. "
                f"Retrying with max_request_count={max_request_count}. "
                f"Attempt {attempts}/{MAX_BATCH_ATTEMPTS}"
            )
            continue

        newly_accepted = 0
        for question in generated_questions:
            if not is_question_difficulty_valid(question, difficulty):
                continue

            if not is_prompt_unique(question.prompt, seen_prompt_keys, seen_prompt_key_list):
                continue

            if not is_prompt_unique(question.prompt, local_seen_keys, local_seen_key_list):
                continue

            normalized_prompt = normalize_prompt_key(question.prompt)
            local_seen_keys.add(normalized_prompt)
            local_seen_key_list.append(normalized_prompt)
            accepted_questions.append(question)
            newly_accepted += 1

            if len(accepted_questions) == count:
                break

        attempts += 1
        if len(accepted_questions) < count:
            print(
                f"Accepted {newly_accepted}/{request_count} in constrained batch. "
                f"Need {count - len(accepted_questions)} more. "
                f"Attempt {attempts}/{MAX_BATCH_ATTEMPTS}"
            )

    is_complete = len(accepted_questions) == count
    return accepted_questions, is_complete

if __name__ == "__main__":
    if (len(sys.argv) > 5 or len(sys.argv) < 1 
        or sys.argv[1] not in ['all', 'test'] 
        or sys.argv[2] not in THEMES ):
        print("Usage: python3.11 generate_questions.py <mode=all|test> <theme> <difficulty> [count]")
        sys.exit(1)
    
    mode = sys.argv[1]
    theme = sys.argv[2]

    final_questions = []
    failed_batches: list[str] = []
    seen_prompt_keys: set[str] = set()
    seen_prompt_key_list: list[str] = []
    seen_prompts_for_context: list[str] = []

    if mode == 'all':
        output_path = f"results/questions_{theme}.json"
        partial_output_path = f"results/questions_{theme}.partial.json"

        print(f"Generating {sum(difficulty_to_count.values())} questions for theme {theme}")
        for difficulty in [1, 2, 3, 4, 5]:
            print(f"Generating {difficulty_to_count[difficulty]} questions for difficulty {difficulty}")
            remaining = difficulty_to_count[difficulty]
            while remaining > 0:
                batch_count = min(MAX_QUESTIONS_PER_REQUEST, remaining)
                try:
                    questions, is_complete = generate_constrained_batch(
                        theme,
                        difficulty,
                        batch_count,
                        seen_prompt_keys,
                        seen_prompt_key_list,
                        seen_prompts_for_context
                    )
                except Exception as error:
                    save_questions_to_file(partial_output_path, final_questions)
                    print(f"Batch failed for difficulty {difficulty} with count {batch_count}: {error}")
                    print(
                        f"Saved {len(final_questions)} partial questions to "
                        f"{partial_output_path}"
                    )
                    failed_batches.append(
                        f"difficulty={difficulty}, requested_batch={batch_count}, error={error}"
                    )
                    break

                questions_with_difficulty = [
                    question.model_copy(update={'difficulty': difficulty})
                    for question in questions
                ]
                final_questions.extend(questions_with_difficulty)
                for question in questions:
                    normalized_prompt = normalize_prompt_key(question.prompt)
                    seen_prompt_keys.add(normalized_prompt)
                    seen_prompt_key_list.append(normalized_prompt)
                    seen_prompts_for_context.append(question.prompt)

                if not is_complete:
                    failed_batches.append(
                        "difficulty="
                        f"{difficulty}, requested_batch={batch_count}, "
                        f"accepted_batch={len(questions)}, "
                        f"error=Could not fill constrained batch within attempts"
                    )
                    print(
                        f"Batch underfilled for difficulty {difficulty}: "
                        f"accepted {len(questions)}/{batch_count}. "
                        "Keeping accepted questions and moving on."
                    )
                    remaining -= len(questions)
                    if len(questions) == 0:
                        break
                else:
                    remaining -= batch_count

                print(f"Generated batch of {len(questions)}, remaining: {remaining}")

                # Always checkpoint after successful batches
                save_questions_to_file(partial_output_path, final_questions)

        print(f"Generated {len(final_questions)} questions")
        if failed_batches:
            print("Some batches failed but generation continued:")
            for failed_batch in failed_batches:
                print(f"- {failed_batch}")

        # export as json file
        save_questions_to_file(output_path, final_questions)
        if os.path.exists(partial_output_path):
            os.remove(partial_output_path)
        if len(final_questions) == 0 and os.path.exists(partial_output_path):
            os.remove(partial_output_path)
            print("No questions generated")

        print(f"Generated {len(final_questions)} questions and saved to {output_path}")

    else:
        difficulty = int(sys.argv[3]) if len(sys.argv) > 3 else None # optional
        count = int(sys.argv[4]) if len(sys.argv) > 4 else 1 # optional
        
        final_questions, is_complete = generate_constrained_batch(
            theme,
            difficulty,
            count,
            seen_prompt_keys,
            seen_prompt_key_list,
            seen_prompts_for_context
        )
        if not is_complete:
            print(
                f"Requested {count} question(s), generated {len(final_questions)} after retries. "
                "Keeping partial results."
            )
        if difficulty is not None:
            final_questions = [
                q.model_copy(update={'difficulty': difficulty})
                for q in final_questions
            ]
        
        print(f"Generated {len(final_questions)} questions")
        
        # export as json file
        with open(f"results/questions_{theme}_{difficulty}_{count}.json", "w") as f:
            json.dump([q.model_dump() for q in final_questions], f, indent=2)
        
        print(f"Generated {len(final_questions)} questions and saved to results/questions_{theme}_{difficulty if difficulty else ''}.json")
    



    
