# sql2oracle

A web application that converts SQL from various dialects into Oracle-compatible SQL syntax.

## Stack

- **Backend**: Python 3.11 with Flask
- **SQL Transpilation**: sqlglot library
- **Frontend**: Vanilla HTML/CSS/JavaScript (no build step)

## Project Structure

```
app.py              # Flask application (routes + conversion logic)
templates/
  index.html        # Main SQL converter page
  architecture.html # Oracle Architecture interactive diagram (Torch House Tech)
static/
  style.css         # Dark-themed CSS
  app.js            # Frontend JavaScript
```

## Running

```bash
python app.py
```

The app runs on port 5000.

## Features

- Converts SQL from MySQL, PostgreSQL, SQL Server, BigQuery, Snowflake, Redshift, SQLite, Hive, Spark, Presto, Trino, DuckDB, and Oracle to Oracle SQL
- Auto-detects dialect or user can select manually
- Handles multiple SQL statements
- Copy-to-clipboard output
- Built-in examples
- Oracle Database Architecture interactive diagram at `/architecture`

## API

- `GET /` - Main SQL converter UI
- `GET /architecture` - Oracle Architecture interactive diagram
- `POST /convert` - Convert SQL; body: `{ sql: string, source?: string }`
- `GET /dialects` - List supported source dialects
