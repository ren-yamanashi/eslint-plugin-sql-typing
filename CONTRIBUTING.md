# Contributing to eslint-plugin-sql-typing

Thank you for your interest in contributing! This document provides guidelines and instructions for development.

## Prerequisites

- Node.js 18.18.0 or higher
- pnpm 10.x
- Docker (optional, for running integration tests)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ren-yamanashi/eslint-plugin-sql-typing.git
cd eslint-plugin-sql-typing
```

### 2. Run setup

```bash
pnpm setup
```

### 3. Run tests

```bash
pnpm test
```

## Database Setup (Optional)

A MySQL database is required to run integration tests and examples. Without it, integration tests will be skipped automatically.

### 1. Configure Environment Variables

```bash
# Copy the default environment file (this is done automatically by pnpm setup)
cp default.env .env

# Edit .env if you need to change the default values
```

### 2. Start MySQL with Docker

```bash
# Start MySQL container
cd examples/mysql2
docker compose up -d

# Wait for MySQL to be ready (about 10-20 seconds)
# The schema is automatically applied via docker-entrypoint-initdb.d
```

### Database Configuration

The following environment variables configure the database connection (defined in `.env`):

| Variable      | Default  | Description                              |
| ------------- | -------- | ---------------------------------------- |
| `DB_HOST`     | -        | MySQL host (required to enable DB tests) |
| `DB_PORT`     | 3306     | MySQL port                               |
| `DB_USER`     | root     | MySQL user                               |
| `DB_PASSWORD` | password | MySQL password                           |
| `DB_NAME`     | test_db  | Database name                            |

### Running Integration Tests

```bash
# Load environment variables from .env and run tests
source .env && pnpm test

# Or set environment variables directly
DB_HOST=localhost DB_PASSWORD=test pnpm test
```

### Running Examples

```bash
cd examples/mysql2

# Start the database
docker compose up -d

# Run ESLint on example files
pnpm lint

# Run ESLint with autofix
pnpm lint:fix
```

## Development Workflow

### Available Scripts

| Script            | Description                             |
| ----------------- | --------------------------------------- |
| `pnpm setup`      | Run initial setup (env, install, build) |
| `pnpm build`      | Build the plugin                        |
| `pnpm test`       | Run unit tests                          |
| `pnpm lint`       | Run ESLint with autofix                 |
| `pnpm lint:check` | Run ESLint without autofix              |
| `pnpm fmt`        | Format code with oxfmt                  |
| `pnpm fmt:check`  | Check code formatting                   |
| `pnpm check`      | Run TypeScript type checking            |

### Before Submitting a Pull Request

Run all checks:

```bash
pnpm lint && pnpm fmt && pnpm check && pnpm test
```

## Code Style

### Language

- All code, comments, and documentation must be written in **English**
- Japanese is only allowed in files matching `.gitignore` patterns (e.g., `.claude/.ai-output/`)

### Test Structure

Tests follow the GIVEN/WHEN/THEN pattern:

```typescript
it("should do something", () => {
  // GIVEN
  const input = "test";

  // WHEN
  const result = someFunction(input);

  // THEN
  expect(result).toBe("expected");
});
```

### JSDoc

All public functions and methods should have JSDoc comments:

```typescript
/**
 * Brief description of what this function does
 */
function myFunction(): void {
  // ...
}
```

## Project Structure

```
eslint-plugin-sql-typing/
├── src/
│   ├── index.ts              # Plugin entry point
│   ├── rules/                # ESLint rules
│   ├── core/                 # Core logic (parser, type inference)
│   ├── adapters/             # Database and library adapters
│   ├── cache/                # Query result caching
│   └── types/                # TypeScript type definitions
├── examples/
│   └── mysql2/               # Example project with mysql2
└── dist/                     # Built output
```

## Stopping the Database

```bash
cd examples/mysql2
docker compose down

# To also remove the data volume:
docker compose down -v
```
