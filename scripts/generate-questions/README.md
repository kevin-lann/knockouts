# Generate Questions Script

`generate_questions.py` creates trivia questions using Gemini and writes JSON files under `scripts/generate-questions/results/`.

## What This Script Does

- Generates questions by theme and difficulty
- Forces JSON output with a schema
- Applies retries for transient API failures
- Uses batching to avoid oversized responses
- Passes cross-request context to avoid repeating prior prompts
- Deduplicates using exact and fuzzy prompt matching
- Enforces difficulty heuristics (answer-count ranges per level)
- Checkpoints progress to `.partial.json`
- Keeps partial accepted questions even when a batch is underfilled

## Resilience and Quality Techniques

### 1. Retry with exponential backoff
- Retries transient errors (`429`, `500`, `502`, `503`, `504`)
- Controlled by:
  - `GEMINI_MAX_RETRIES` (default: `5`)
  - `GEMINI_RETRY_BASE_DELAY_SECONDS` (default: `2`)

### 2. Batching and output-size control
- Large requests are split into smaller batch calls
- `MAX_QUESTIONS_PER_REQUEST` limits per API request (default in code: `10`)
- `GEMINI_MAX_OUTPUT_TOKENS` caps model output tokens (default: `65536`)

### 3. Cross-request context orchestration
- Each request includes recent generated prompts (`avoid_prompts`)
- Model is explicitly told to avoid semantically similar prompts
- This reduces duplicates across batches and difficulties

### 4. Deduplication
- Exact dedupe on normalized prompt keys (lowercased, punctuation stripped, whitespace-normalized)
- Fuzzy dedupe via prompt similarity (`SequenceMatcher`)
- Controlled by:
  - `PROMPT_SIMILARITY_THRESHOLD` (default: `0.9`)

### 5. Difficulty enforcement
- Questions are accepted only if answer count fits configured range:
  - Difficulty `1`: `15-100`
  - Difficulty `2`: `10-80`
  - Difficulty `3`: `7-55`
  - Difficulty `4`: `4-35`
  - Difficulty `5`: `2-25`
- Rejected questions are regenerated within attempt limits
- Controlled by:
  - `GEMINI_MAX_BATCH_ATTEMPTS` (default: `8`)

### 6. JSON cutoff protection
- If response JSON is truncated (common near output-token ceiling), parse errors are caught
- Batch request size is automatically reduced and retried
- The run continues instead of crashing

### 7. Checkpointing and partial preservation
- In `all` mode, successful progress is checkpointed to:
  - `results/questions_<THEME>.partial.json`
- On batch underfill/failure, accepted questions are still kept and saved
- Final output is written to:
  - `results/questions_<THEME>.json`

## Setup

From repo root:

```bash
cd scripts/generate-questions
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `.env` in `scripts/generate-questions/`:

```bash
GEMINI_API_KEY=your_key_here
```

Optional tuning env vars:

```bash
GEMINI_MAX_OUTPUT_TOKENS=65536
GEMINI_MAX_RETRIES=5
GEMINI_RETRY_BASE_DELAY_SECONDS=2
GEMINI_MAX_BATCH_ATTEMPTS=8
PROMPT_SIMILARITY_THRESHOLD=0.9
```

## Usage

### Mode: `all`
Generates the full difficulty distribution for one theme using internal `difficulty_to_count`.

```bash
cd scripts/generate-questions
python3.11 generate_questions.py all MOVIES_AND_TV
```

Output:
- Final: `results/questions_MOVIES_AND_TV.json`
- Checkpoint during run: `results/questions_MOVIES_AND_TV.partial.json`

### Mode: `test`
Generates for a specific difficulty and count.

```bash
cd scripts/generate-questions
python3.11 generate_questions.py test MOVIES_AND_TV 3 15
```

Args:
- `mode`: `all` or `test`
- `theme`: one of `THEMES` in `constant.py`
- `difficulty` (test mode): `1-5`
- `count` (test mode): number of questions requested

Output:
- `results/questions_<THEME>_<DIFFICULTY>_<COUNT>.json`

## Available Themes

- `MOVIES_AND_TV`
- `MUSIC`
- `VIDEO_GAMES`
- `BOOKS`
- `INTERNET_AND_SOCIAL_MEDIA`
- `TECH`
- `BRANDS_AND_BUSINESSES`
- `FOOD_AND_DRINK`
- `SPORTS`
- `GEOGRAPHY`
- `HISTORY`
- `SCIENCE_AND_NATURE`
- `ANIMALS`
- `LANGUAGE_AND_WORDS`
