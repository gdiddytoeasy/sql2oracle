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
  projects.html     # Student Projects hub (at /projects)
static/
  style.css         # Dark-themed CSS
  app.js            # Frontend JavaScript
  nav.js            # Shared nav bar (injected into every page)
  logo.svg          # Logo asset
pyproject.toml      # Python project config and dependencies
```

## Routes

| Method | Path           | Description                              |
|--------|----------------|------------------------------------------|
| GET    | `/`            | Login page (default landing)             |
| GET    | `/sql`         | SQL converter UI                         |
| GET    | `/architecture`| Oracle Architecture interactive diagram  |
| GET    | `/projects`    | Student projects hub (assignments, showcase, labs) |
| POST   | `/convert`     | Convert SQL; body: `{ sql, source? }`    |
| GET    | `/dialects`    | List supported source dialects           |
| GET    | `/api/assignments` | List all assignments |
| POST   | `/api/assignments` | Create assignment; body: `{ title, description, topic, difficulty, created_by, due_date? }` |
| PUT    | `/api/assignments/<id>` | Update assignment |
| DELETE | `/api/assignments/<id>` | Delete assignment |
| GET    | `/api/showcase` | List showcase entries; query: `role`, `username` |
| POST   | `/api/showcase` | Submit entry; body: `{ student_username, title, description, url? }` |
| PUT    | `/api/showcase/<id>/approve` | Approve/unpublish entry; body: `{ approved, approved_by }` |
| DELETE | `/api/showcase/<id>` | Delete entry |
| GET    | `/api/lab-topics` | List topics with progress; query: `username` |
| POST   | `/api/lab-topics` | Create topic; body: `{ title, description, icon?, sort_order? }` |
| GET    | `/api/lab-topics/<id>/exercises` | List exercises with progress; query: `username` |
| GET    | `/api/lab-exercises/<id>` | Get exercise; query: `username` |
| POST   | `/api/lab-exercises` | Create exercise; body: `{ topic_id, type, title, content_json, created_by, oraclebase_id? }` |
| PUT    | `/api/lab-exercises/<id>` | Update exercise |
| DELETE | `/api/lab-exercises/<id>` | Delete exercise |
| POST   | `/api/lab-progress` | Save progress; body: `{ username, exercise_id, completed, score?, answer_json? }` |
| GET    | `/api/lab-progress` | Get progress; query: `username` |
| POST   | `/api/admin/oraclebase-fetch` | Fetch + cache article; body: `{ url, topic }` |
| GET    | `/api/oraclebase-cache` | List cached articles; query: `topic?` |

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

Key packages: `flask`, `sqlglot`, `gunicorn`, `requests`, `beautifulsoup4`, `lxml`

## Access Control

- The login page is the default landing (`/`)
- The SQL Converter tab (`/sql`) has access control applied for all users

## Supported SQL Dialects (source)

Auto-detect, MySQL, PostgreSQL, SQLite, SQL Server (T-SQL), BigQuery, Spark SQL, Hive, Presto, Trino, Snowflake, Redshift, DuckDB, Oracle

All dialects are transpiled **to Oracle SQL**.
