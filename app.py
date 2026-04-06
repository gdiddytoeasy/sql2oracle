import json
import os
import psycopg2
import psycopg2.extras
from flask import Flask, request, jsonify, render_template
import sqlglot
import sqlglot.errors
import requests as req
from bs4 import BeautifulSoup

app = Flask(__name__)

# ── Persistent storage via PostgreSQL (survives deployments) ─────────────────

DATABASE_URL = os.environ.get("DATABASE_URL")


def _get_db():
    """Get a PostgreSQL connection."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn


def _init_db():
    """Create tables and seed default users if they don't exist."""
    conn = _get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'dba',
            hash TEXT NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tab_unlocks (
            username TEXT PRIMARY KEY,
            tabs JSONB NOT NULL DEFAULT '["standard"]'::jsonb
        )
    """)
    # Seed default accounts if the table is empty
    cur.execute("SELECT COUNT(*) FROM users")
    if cur.fetchone()[0] == 0:
        defaults = [
            ('admin',   'Administrator', 'admin',   '1e67a4eeb5a014031b0686d14438b922072db3d572696778abcb6ce3257897c2'),
            ('dba1',    'DBA Student',   'dba',     'afdb5173eade6c2f4d471709828049f97eaa493f37ded5f7ea7ba715b1232fc9'),
            ('student', 'Student',       'student', 'f5016f9973ff8e485d4f85090bfd451f97cef471ed95a5f81578058f1342bf2a'),
            ('guest',   'Guest Viewer',  'viewer',  '9594fb14922df9ed9ef4a03fbbea976e27cde7e1ebe0460c6ccfcda2da074281'),
        ]
        for username, display_name, role, hash_ in defaults:
            cur.execute(
                "INSERT INTO users (username, display_name, role, hash) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
                (username, display_name, role, hash_)
            )
    cur.execute("""
        CREATE TABLE IF NOT EXISTS oraclebase_cache (
            id          SERIAL PRIMARY KEY,
            url         TEXT NOT NULL UNIQUE,
            title       TEXT NOT NULL,
            summary     TEXT NOT NULL,
            topic       TEXT NOT NULL,
            cached_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS assignments (
            id          SERIAL PRIMARY KEY,
            title       TEXT NOT NULL,
            description TEXT NOT NULL,
            topic       TEXT NOT NULL,
            difficulty  TEXT NOT NULL CHECK (difficulty IN ('beginner','intermediate','advanced')),
            due_date    DATE,
            created_by  TEXT NOT NULL REFERENCES users(username),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS showcase_entries (
            id               SERIAL PRIMARY KEY,
            student_username TEXT NOT NULL REFERENCES users(username),
            title            TEXT NOT NULL,
            description      TEXT NOT NULL,
            url              TEXT,
            submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            approved         BOOLEAN NOT NULL DEFAULT FALSE,
            approved_by      TEXT REFERENCES users(username),
            approved_at      TIMESTAMPTZ
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS lab_topics (
            id          SERIAL PRIMARY KEY,
            title       TEXT NOT NULL,
            description TEXT NOT NULL,
            icon        TEXT NOT NULL DEFAULT '📚',
            sort_order  INTEGER NOT NULL DEFAULT 0
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS lab_exercises (
            id            SERIAL PRIMARY KEY,
            topic_id      INTEGER NOT NULL REFERENCES lab_topics(id) ON DELETE CASCADE,
            type          TEXT NOT NULL CHECK (type IN ('quiz','scenario','written','flashcard')),
            title         TEXT NOT NULL,
            content_json  JSONB NOT NULL,
            oraclebase_id INTEGER REFERENCES oraclebase_cache(id) ON DELETE SET NULL,
            sort_order    INTEGER NOT NULL DEFAULT 0,
            created_by    TEXT NOT NULL REFERENCES users(username),
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS lab_progress (
            username     TEXT NOT NULL REFERENCES users(username),
            exercise_id  INTEGER NOT NULL REFERENCES lab_exercises(id) ON DELETE CASCADE,
            completed    BOOLEAN NOT NULL DEFAULT FALSE,
            score        INTEGER,
            answer_json  JSONB,
            completed_at TIMESTAMPTZ,
            PRIMARY KEY (username, exercise_id)
        )
    """)
    cur.close()
    conn.close()


_init_db()


# ── User management ──────────────────────────────────────────────────────────

@app.route("/api/users", methods=["GET"])
def get_users():
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT username, display_name AS \"displayName\", role FROM users")
    users = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(users)


@app.route("/api/users", methods=["POST"])
def create_user():
    data = request.get_json()
    if not data or not data.get("username") or not data.get("hash"):
        return jsonify({"error": "username and hash are required"}), 400
    conn = _get_db()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM users WHERE username = %s", (data["username"],))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"error": "Username already exists"}), 409
    cur.execute(
        "INSERT INTO users (username, display_name, role, hash) VALUES (%s, %s, %s, %s)",
        (data["username"], data.get("displayName") or data["username"], data.get("role", "dba"), data["hash"])
    )
    cur.close()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/users/<username>", methods=["DELETE"])
def delete_user(username):
    if username == "admin":
        return jsonify({"error": "Cannot delete admin"}), 403
    conn = _get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (username,))
    cur.execute("DELETE FROM tab_unlocks WHERE username = %s", (username,))
    cur.close()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/users/verify", methods=["POST"])
def verify_user():
    """Verify credentials and return user info (without hash)."""
    data = request.get_json()
    if not data or not data.get("username") or not data.get("hash"):
        return jsonify({"error": "username and hash required"}), 400
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        "SELECT username, display_name AS \"displayName\", role FROM users WHERE username = %s AND hash = %s",
        (data["username"], data["hash"])
    )
    match = cur.fetchone()
    cur.close()
    conn.close()
    if match:
        return jsonify(dict(match))
    return jsonify({"error": "Invalid credentials"}), 401


# ── Tab unlock management ────────────────────────────────────────────────────

@app.route("/api/tab-unlocks", methods=["GET"])
def get_tab_unlocks():
    username = request.args.get("username")
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    if username:
        cur.execute("SELECT tabs FROM tab_unlocks WHERE username = %s", (username,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        return jsonify(row["tabs"] if row else ["standard"])
    cur.execute("SELECT username, tabs FROM tab_unlocks")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({r["username"]: r["tabs"] for r in rows})


@app.route("/api/tab-unlocks", methods=["POST"])
def set_tab_unlocks():
    data = request.get_json()
    if not data or "username" not in data or "tabs" not in data:
        return jsonify({"error": "username and tabs required"}), 400
    conn = _get_db()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO tab_unlocks (username, tabs) VALUES (%s, %s)
           ON CONFLICT (username) DO UPDATE SET tabs = EXCLUDED.tabs""",
        (data["username"], json.dumps(data["tabs"]))
    )
    cur.close()
    conn.close()
    return jsonify({"ok": True})


# ── Main routes ──────────────────────────────────────────────────────────────

@app.route("/")
def login():
    return render_template("login.html")


@app.route("/sql")
def index():
    return render_template("index.html")


@app.route("/architecture")
def architecture():
    return render_template("architecture.html")


@app.route("/convert", methods=["POST"])
def convert():
    data = request.get_json()
    if not data or "sql" not in data:
        return jsonify({"error": "No SQL provided"}), 400

    sql_input = data["sql"].strip()
    source_dialect = data.get("source", "").strip() or None

    if not sql_input:
        return jsonify({"error": "SQL input is empty"}), 400

    try:
        if source_dialect:
            result = sqlglot.transpile(sql_input, read=source_dialect, write="oracle", pretty=True)
        else:
            result = sqlglot.transpile(sql_input, write="oracle", pretty=True)

        converted = ";\n\n".join(result)
        if converted and not converted.rstrip().endswith(";"):
            converted = converted.rstrip() + ";"

        return jsonify({"result": converted, "statements": len(result)})
    except sqlglot.errors.ParseError as e:
        return jsonify({"error": f"Parse error: {str(e)}"}), 422
    except Exception as e:
        return jsonify({"error": f"Conversion error: {str(e)}"}), 500


@app.route("/dialects", methods=["GET"])
def dialects():
    supported = [
        {"value": "", "label": "Auto-detect"},
        {"value": "mysql", "label": "MySQL"},
        {"value": "postgres", "label": "PostgreSQL"},
        {"value": "sqlite", "label": "SQLite"},
        {"value": "mssql", "label": "SQL Server (T-SQL)"},
        {"value": "bigquery", "label": "BigQuery"},
        {"value": "spark", "label": "Spark SQL"},
        {"value": "hive", "label": "Hive"},
        {"value": "presto", "label": "Presto"},
        {"value": "trino", "label": "Trino"},
        {"value": "snowflake", "label": "Snowflake"},
        {"value": "redshift", "label": "Redshift"},
        {"value": "duckdb", "label": "DuckDB"},
        {"value": "oracle", "label": "Oracle"},
    ]
    return jsonify(supported)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
