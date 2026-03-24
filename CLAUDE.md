# CLAUDE.md

## Project Overview

**sql2oracle** — A web application that converts SQL from various dialects into Oracle-compatible SQL syntax.

## Tech Stack

- **Backend**: Python 3.11, Flask
- **SQL Transpilation**: sqlglot library
- **Frontend**: Vanilla HTML/CSS/JavaScript (no build step)
- **Server**: Gunicorn (production)

## Project Structure

```
app.py              # Flask app — all routes and conversion logic
main.py             # Entrypoint stub (unused)
templates/
  login.html        # Login page (default landing at /)
  index.html        # SQL converter UI (at /sql)
  architecture.html # Oracle Architecture interactive diagram (at /architecture)
static/
  style.css         # Dark-themed CSS
  app.js            # Frontend JavaScript
  logo.svg          # Logo asset
pyproject.toml      # Python project config and dependencies
```

## Routes

| Method | Path           | Description                              |
|--------|----------------|------------------------------------------|
| GET    | `/`            | Login page (default landing)             |
| GET    | `/sql`         | SQL converter UI                         |
| GET    | `/architecture`| Oracle Architecture interactive diagram  |
| POST   | `/convert`     | Convert SQL; body: `{ sql, source? }`    |
| GET    | `/dialects`    | List supported source dialects           |

## Running Locally

```bash
python app.py
```

Runs on port 5000 with debug mode enabled.

## Dependencies

Managed via `pyproject.toml` and `uv.lock`. Install with:

```bash
uv sync
```

Key packages: `flask`, `sqlglot`, `gunicorn`

## Access Control

- The login page is the default landing (`/`)
- The SQL Converter tab (`/sql`) has access control applied for all users

## Supported SQL Dialects (source)

Auto-detect, MySQL, PostgreSQL, SQLite, SQL Server (T-SQL), BigQuery, Spark SQL, Hive, Presto, Trino, Snowflake, Redshift, DuckDB, Oracle

All dialects are transpiled **to Oracle SQL**.
