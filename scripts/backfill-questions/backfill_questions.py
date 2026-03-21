#!/usr/bin/env python3
"""Backfill questions + answers into Neon/Postgres from a JSON file.

Input JSON format (list of objects):
[
  {
    "prompt": "...",
    "answers": [
      {"display_text": "...", "variants": ["..."], "popularity_rank": 1}
    ],
    "theme_slug": "HISTORY",
    "answer_count_cache": 56
  }
]
"""
from __future__ import annotations
from dotenv import load_dotenv
import argparse
import json
import os
from pathlib import Path
from typing import Any
load_dotenv()


def _load_database_url(explicit_env: str | None) -> str:
    if explicit_env:
        return explicit_env

    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]

    raise SystemExit(
        "DATABASE_URL not found. Set it in environment or in a .env file."
    )


def _ensure_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _open_db(database_url: str):
    try:
        import psycopg  # type: ignore

        # Supabase pooler (PgBouncer) can error on named prepared statements
        # across reused backend connections. Disable auto-prepare for compatibility.
        conn = psycopg.connect(database_url, prepare_threshold=None)
        conn.prepare_threshold = None
        return conn
    except ImportError:
        import psycopg2  # type: ignore

        return psycopg2.connect(database_url)


def _normalize_questions(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and "questions" in payload:
        return _ensure_list(payload["questions"])
    raise SystemExit("Input JSON must be a list of questions or {\"questions\": [...]}.")


def _log_connection_info(cur, database_url: str) -> None:
    cur.execute(
        """
        SELECT
            current_database(),
            current_schema(),
            current_user,
            inet_server_addr()::text,
            inet_server_port()
        """
    )
    row = cur.fetchone()
    if row:
        db, schema, user, host, port = row
        print(
            "Connected to DB:",
            f"db={db} schema={schema} user={user} host={host} port={port}",
        )
    print("DATABASE_URL:", os.environ["DATABASE_URL"] )


def backfill(
    database_url: str,
    input_path: Path,
    replace_answers: bool,
    dry_run: bool,
) -> None:
    payload = json.loads(input_path.read_text())
    questions = _normalize_questions(payload)

    if dry_run:
        print(f"Dry run: {len(questions)} questions loaded from {input_path}")
        return

    conn = _open_db(database_url)
    try:
        with conn:
            with conn.cursor() as cur:
                _log_connection_info(cur, database_url)
                for index, item in enumerate(questions, start=1):
                    prompt = (item.get("prompt") or "").strip()
                    theme_slug = (item.get("theme_slug") or "").strip()
                    answers = _ensure_list(item.get("answers"))
                    answer_count = item.get("answer_count_cache")

                    if not prompt or not theme_slug:
                        raise SystemExit(f"Invalid question at index {index}: missing prompt/theme_slug")

                    if answer_count is None:
                        answer_count = len(answers)

                    # Get or create question
                    cur.execute(
                        """
                        SELECT id FROM questions
                        WHERE theme_slug = %s AND prompt = %s
                        """,
                        (theme_slug, prompt),
                    )
                    row = cur.fetchone()
                    if row:
                        question_id = row[0]
                        cur.execute(
                            """
                            UPDATE questions
                            SET answer_count_cache = %s
                            WHERE id = %s
                            """,
                            (answer_count, question_id),
                        )
                    else:
                        cur.execute(
                            """
                            INSERT INTO questions (theme_slug, prompt, answer_count_cache)
                            VALUES (%s, %s, %s)
                            RETURNING id
                            """,
                            (theme_slug, prompt, answer_count),
                        )
                        question_id = cur.fetchone()[0]

                    if replace_answers:
                        cur.execute(
                            "DELETE FROM answers WHERE question_id = %s",
                            (question_id,),
                        )

                    cleaned_answers: list[tuple[str, str, int]] = []
                    for answer in answers:
                        display_text = (answer.get("display_text") or "").strip()
                        if not display_text:
                            continue
                        variants = _ensure_list(answer.get("variants"))
                        popularity_rank = answer.get("popularity_rank") or 99
                        cleaned_answers.append(
                            (display_text, json.dumps(variants), popularity_rank)
                        )

                    print(
                        f"[{index}/{len(questions)}] {theme_slug} | {prompt} "
                        f"({len(cleaned_answers)} answers)"
                    )

                    if not cleaned_answers:
                        continue

                    rows = [
                        (question_id, display_text, variants_json, popularity_rank)
                        for display_text, variants_json, popularity_rank in cleaned_answers
                    ]

                    if replace_answers:
                        cur.executemany(
                            """
                            INSERT INTO answers (question_id, display_text, variants, popularity_rank)
                            VALUES (%s, %s, %s::jsonb, %s)
                            """,
                            rows,
                        )
                        print(f"  inserted {len(rows)} answers")
                    else:
                        cur.executemany(
                            """
                            INSERT INTO answers (question_id, display_text, variants, popularity_rank)
                            VALUES (%s, %s, %s::jsonb, %s)
                            ON CONFLICT (question_id, display_text)
                            DO UPDATE SET
                                variants = EXCLUDED.variants,
                                popularity_rank = EXCLUDED.popularity_rank
                            """,
                            rows,
                        )
                        print(f"  upserted {len(rows)} answers")

        print(f"Backfill complete: {len(questions)} questions processed.")
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill questions into Neon/Postgres.")
    parser.add_argument("input", type=Path, nargs="?", help="Path to questions JSON file")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Run for all JSON files in --input-dir",
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=Path("../generate-questions/results"),
        help="Directory used by --all (default: ../generate-questions/results)",
    )
    parser.add_argument("--replace-answers", action="store_true", help="Replace answers for matching questions")
    parser.add_argument("--dry-run", action="store_true", help="Validate input without writing to DB")
    parser.add_argument("--database-url", help="Override DATABASE_URL")
    args = parser.parse_args()

    if args.all and args.input is not None:
        raise SystemExit("Use either a single input file or --all, not both.")

    if not args.all and args.input is None:
        raise SystemExit("Provide an input JSON file or pass --all.")

    database_url = _load_database_url(args.database_url)

    if args.all:
        input_dir = args.input_dir
        if not input_dir.exists() or not input_dir.is_dir():
            raise SystemExit(f"Input directory not found: {input_dir}")

        json_files = sorted(path for path in input_dir.iterdir() if path.is_file() and path.suffix == ".json")
        if not json_files:
            raise SystemExit(f"No JSON files found in: {input_dir}")

        print(f"Processing {len(json_files)} JSON files from {input_dir}")
        for index, json_file in enumerate(json_files, start=1):
            print(f"\n[{index}/{len(json_files)}] {json_file}")
            backfill(database_url, json_file, args.replace_answers, args.dry_run)
        return

    backfill(database_url, args.input, args.replace_answers, args.dry_run)


if __name__ == "__main__":
    main()
