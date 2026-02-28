#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
GAME_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${GAME_DIR}/.env"

usage() {
  echo "Usage: ./migrate.sh [one <migration_name>]"
  echo "  no args                Run all migrations in order"
  echo "  one <migration_name>   Run one migration (with or without .sql)"
}

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Error: .env file not found at ${ENV_FILE}" >&2
  exit 1
fi

DATABASE_URL=""
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" ]] && continue
  [[ "$line" =~ ^[[:space:]]*# ]] && continue

  if [[ "$line" == DATABASE_URL=* ]]; then
    DATABASE_URL="${line#DATABASE_URL=}"
    if [[ "$DATABASE_URL" == '"'*'"' ]]; then
      DATABASE_URL="${DATABASE_URL:1:${#DATABASE_URL}-2}"
    elif [[ "$DATABASE_URL" == "'"*"'" ]]; then
      DATABASE_URL="${DATABASE_URL:1:${#DATABASE_URL}-2}"
    fi
    break
  fi
done < "${ENV_FILE}"

if [[ -z "${DATABASE_URL}" ]]; then
  echo "Error: DATABASE_URL not found in ${ENV_FILE}" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is not installed or not in PATH" >&2
  exit 1
fi

run_migration() {
  local migration_path="$1"
  if [[ ! -f "$migration_path" ]]; then
    echo "Error: migration not found: $migration_path" >&2
    exit 1
  fi

  echo "Applying migration: $(basename "$migration_path")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration_path"
}

if [[ $# -eq 0 ]]; then
  shopt -s nullglob
  migrations=("${SCRIPT_DIR}"/*.sql)
  shopt -u nullglob

  if [[ ${#migrations[@]} -eq 0 ]]; then
    echo "No migration files found in ${SCRIPT_DIR}" >&2
    exit 1
  fi

  for migration in "${migrations[@]}"; do
    run_migration "$migration"
  done

  echo "All migrations applied successfully"
  exit 0
fi

if [[ "$1" == "one" ]]; then
  if [[ $# -ne 2 ]]; then
    usage
    exit 1
  fi

  migration_name="$2"
  if [[ "$migration_name" != *.sql ]]; then
    migration_name="${migration_name}.sql"
  fi

  run_migration "${SCRIPT_DIR}/${migration_name}"
  echo "Migration applied successfully"
  exit 0
fi

usage
exit 1
