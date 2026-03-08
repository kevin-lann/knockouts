# Backfill Questions

This script backfills question + answers from JSON files into the database.

## How to run 

1. Create virtual environemtn
```bash
cd scripts/backfill-questions
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Create `.env` in `scripts/backfill-questions/`:

```bash
DATABASE_URL=<your neon db url>
```

3. Run script

```bash
python3.11 backfill_questions.py ../generate-questions/results/questions_GEOGRAPHY.jso
```

Optional args:
- `--replace-answers`: Replaces exisiting questions with the same prompt
- `--dry-run`: Validate script without writing to DB
- `--database-url`: Override `DATABASE_URL`