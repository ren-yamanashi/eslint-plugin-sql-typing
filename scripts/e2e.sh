#!/usr/bin/env bash
set -eu

cd "$(dirname "$0")"
cd ../

# Load .env file
if [[ -f ".env" ]]; then
  set -a
  source ".env"
  set +a
else
  echo "Error: .env file not found"
  echo "Run 'cp default.env .env' to create one."
  exit 1
fi

# Validate required environment variables
for var in DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME; do
  if [[ -z "${!var:-}" ]]; then
    echo "Error: $var is not set in .env"
    exit 1
  fi
done

pnpm build
pnpm test
