import json
import os
import psycopg2
import psycopg2.extras
from flask import Flask, request, jsonify, render_template, make_response
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
    # Always ensure admin account has the correct role and password (Admin@Oracle1)
    cur.execute(
        "UPDATE users SET hash = %s, role = 'admin' WHERE username = 'admin'",
        ('1e67a4eeb5a014031b0686d14438b922072db3d572696778abcb6ce3257897c2',)
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


def no_cache(response):
    response = make_response(response)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response



# ── Main routes ──────────────────────────────────────────────────────────────

@app.route("/")
def login():
    return no_cache(render_template("login.html"))


@app.route("/sql")
def index():
    return no_cache(render_template("index.html"))


@app.route("/architecture")
def architecture():
    return no_cache(render_template("architecture.html"))


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


@app.route("/projects")
def projects():
    return no_cache(render_template("projects.html"))


@app.route("/api/admin/oraclebase-fetch", methods=["POST"])
def oraclebase_fetch():
    data = request.get_json()
    if not data or not data.get("url") or not data.get("topic"):
        return jsonify({"error": "url and topic required"}), 400
    url = data["url"].strip()
    topic = data["topic"].strip()
    if not url.startswith("https://www.oraclebase.com/"):
        return jsonify({"error": "Only oraclebase.com URLs are accepted"}), 400
    try:
        resp = req.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
    except Exception as e:
        return jsonify({"error": f"Fetch failed: {str(e)}"}), 502
    soup = BeautifulSoup(resp.text, "lxml")
    title_tag = soup.find("h1") or soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else url
    # Grab first 3 non-empty paragraphs from main content area
    main = soup.find("div", {"id": "main-content"}) or soup.find("article") or soup.body
    paras = [p.get_text(" ", strip=True) for p in (main.find_all("p") if main else []) if len(p.get_text(strip=True)) > 40]
    summary = " ".join(paras[:3]) or "No summary available."
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        INSERT INTO oraclebase_cache (url, title, summary, topic)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (url) DO UPDATE SET title=EXCLUDED.title, summary=EXCLUDED.summary,
            topic=EXCLUDED.topic, cached_at=NOW()
        RETURNING *
    """, (url, title, summary[:1000], topic))
    row = dict(cur.fetchone())
    cur.close()
    conn.close()
    return jsonify(row)


@app.route("/api/oraclebase-cache", methods=["GET"])
def oraclebase_cache_list():
    topic = request.args.get("topic")
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    if topic:
        cur.execute("SELECT * FROM oraclebase_cache WHERE topic = %s ORDER BY cached_at DESC", (topic,))
    else:
        cur.execute("SELECT * FROM oraclebase_cache ORDER BY cached_at DESC")
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(rows)


@app.route("/api/assignments", methods=["GET"])
def get_assignments():
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM assignments ORDER BY created_at DESC")
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(rows)


@app.route("/api/assignments", methods=["POST"])
def create_assignment():
    data = request.get_json()
    required = ("title", "description", "topic", "difficulty", "created_by")
    if not data or any(k not in data for k in required):
        return jsonify({"error": "title, description, topic, difficulty, created_by required"}), 400
    if data["difficulty"] not in ("beginner", "intermediate", "advanced"):
        return jsonify({"error": "difficulty must be beginner, intermediate, or advanced"}), 400
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        INSERT INTO assignments (title, description, topic, difficulty, due_date, created_by)
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING *
    """, (data["title"], data["description"], data["topic"], data["difficulty"],
          data.get("due_date"), data["created_by"]))
    row = dict(cur.fetchone())
    cur.close()
    conn.close()
    return jsonify(row), 201


@app.route("/api/assignments/<int:assignment_id>", methods=["PUT"])
def update_assignment(assignment_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    required = ("title", "description", "topic", "difficulty")
    if any(data.get(k) is None for k in required):
        return jsonify({"error": "title, description, topic, difficulty required"}), 400
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        UPDATE assignments SET title=%s, description=%s, topic=%s, difficulty=%s, due_date=%s
        WHERE id=%s RETURNING *
    """, (data.get("title"), data.get("description"), data.get("topic"),
          data.get("difficulty"), data.get("due_date"), assignment_id))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row))


@app.route("/api/assignments/<int:assignment_id>", methods=["DELETE"])
def delete_assignment(assignment_id):
    conn = _get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM assignments WHERE id=%s", (assignment_id,))
    cur.close()
    conn.close()
    return jsonify({"ok": True})


# ── Showcase API ─────────────────────────────────────────────────────────────

@app.route("/api/showcase", methods=["GET"])
def get_showcase():
    """Returns approved entries for students; all entries for admin/manager."""
    role = request.args.get("role", "student")
    username = request.args.get("username", "")
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    if role in ("admin", "manager"):
        cur.execute("SELECT * FROM showcase_entries ORDER BY submitted_at DESC")
    else:
        cur.execute("""
            SELECT * FROM showcase_entries
            WHERE approved = TRUE OR student_username = %s
            ORDER BY submitted_at DESC
        """, (username,))
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(rows)


@app.route("/api/showcase", methods=["POST"])
def create_showcase():
    data = request.get_json()
    if not data or not data.get("student_username") or not data.get("title") or not data.get("description"):
        return jsonify({"error": "student_username, title, description required"}), 400
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        INSERT INTO showcase_entries (student_username, title, description, url)
        VALUES (%s, %s, %s, %s) RETURNING *
    """, (data["student_username"], data["title"], data["description"], data.get("url")))
    row = dict(cur.fetchone())
    cur.close()
    conn.close()
    return jsonify(row), 201


@app.route("/api/showcase/<int:entry_id>/approve", methods=["PUT"])
def approve_showcase(entry_id):
    data = request.get_json() or {}
    approved = data.get("approved", True)
    approved_by = data.get("approved_by", "admin")
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        UPDATE showcase_entries
        SET approved=%s, approved_by=%s, approved_at=CASE WHEN %s THEN NOW() ELSE NULL END
        WHERE id=%s RETURNING *
    """, (approved, approved_by if approved else None, approved, entry_id))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row))


@app.route("/api/showcase/<int:entry_id>", methods=["DELETE"])
def delete_showcase(entry_id):
    conn = _get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM showcase_entries WHERE id=%s", (entry_id,))
    cur.close()
    conn.close()
    return jsonify({"ok": True})


# ── Lab Topics + Exercises API ───────────────────────────────────────────────

@app.route("/api/lab-topics", methods=["GET"])
def get_lab_topics():
    username = request.args.get("username", "")
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM lab_topics ORDER BY sort_order, id")
    topics = [dict(r) for r in cur.fetchall()]
    for topic in topics:
        cur.execute("SELECT COUNT(*) FROM lab_exercises WHERE topic_id=%s", (topic["id"],))
        topic["exercise_count"] = cur.fetchone()["count"]
        if username:
            cur.execute("""
                SELECT COUNT(*) FROM lab_progress lp
                JOIN lab_exercises le ON le.id = lp.exercise_id
                WHERE le.topic_id=%s AND lp.username=%s AND lp.completed=TRUE
            """, (topic["id"], username))
            topic["completed_count"] = cur.fetchone()["count"]
        else:
            topic["completed_count"] = 0
    cur.close()
    conn.close()
    return jsonify(topics)


@app.route("/api/lab-topics", methods=["POST"])
def create_lab_topic():
    data = request.get_json()
    if not data or not data.get("title") or not data.get("description"):
        return jsonify({"error": "title and description required"}), 400
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        INSERT INTO lab_topics (title, description, icon, sort_order)
        VALUES (%s, %s, %s, %s) RETURNING *
    """, (data["title"], data["description"], data.get("icon", "📚"), data.get("sort_order", 0)))
    row = dict(cur.fetchone())
    cur.close()
    conn.close()
    return jsonify(row), 201


@app.route("/api/lab-topics/<int:topic_id>/exercises", methods=["GET"])
def get_lab_exercises(topic_id):
    username = request.args.get("username", "")
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT le.*, oc.title AS ora_title, oc.summary AS ora_summary, oc.url AS ora_url
        FROM lab_exercises le
        LEFT JOIN oraclebase_cache oc ON oc.id = le.oraclebase_id
        WHERE le.topic_id=%s ORDER BY le.sort_order, le.id
    """, (topic_id,))
    exercises = [dict(r) for r in cur.fetchall()]
    if username:
        for ex in exercises:
            cur.execute("""
                SELECT completed, score, answer_json FROM lab_progress
                WHERE username=%s AND exercise_id=%s
            """, (username, ex["id"]))
            prog = cur.fetchone()
            ex["progress"] = dict(prog) if prog else None
    cur.close()
    conn.close()
    return jsonify(exercises)


@app.route("/api/lab-exercises/<int:exercise_id>", methods=["GET"])
def get_lab_exercise(exercise_id):
    username = request.args.get("username", "")
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT le.*, oc.title AS ora_title, oc.summary AS ora_summary, oc.url AS ora_url
        FROM lab_exercises le
        LEFT JOIN oraclebase_cache oc ON oc.id = le.oraclebase_id
        WHERE le.id=%s
    """, (exercise_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({"error": "Not found"}), 404
    ex = dict(row)
    if username:
        cur.execute("SELECT completed, score, answer_json FROM lab_progress WHERE username=%s AND exercise_id=%s",
                    (username, exercise_id))
        prog = cur.fetchone()
        ex["progress"] = dict(prog) if prog else None
    cur.close()
    conn.close()
    return jsonify(ex)


@app.route("/api/lab-exercises", methods=["POST"])
def create_lab_exercise():
    data = request.get_json()
    required = ("topic_id", "type", "title", "content_json", "created_by")
    if not data or any(k not in data for k in required):
        return jsonify({"error": "topic_id, type, title, content_json, created_by required"}), 400
    if data["type"] not in ("quiz", "scenario", "written", "flashcard"):
        return jsonify({"error": "type must be quiz, scenario, written, or flashcard"}), 400
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        INSERT INTO lab_exercises (topic_id, type, title, content_json, oraclebase_id, sort_order, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *
    """, (data["topic_id"], data["type"], data["title"],
          json.dumps(data["content_json"]), data.get("oraclebase_id"),
          data.get("sort_order", 0), data["created_by"]))
    row = dict(cur.fetchone())
    cur.close()
    conn.close()
    return jsonify(row), 201


@app.route("/api/lab-exercises/<int:exercise_id>", methods=["PUT"])
def update_lab_exercise(exercise_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        UPDATE lab_exercises SET title=%s, content_json=%s, oraclebase_id=%s, sort_order=%s
        WHERE id=%s RETURNING *
    """, (data.get("title"), json.dumps(data.get("content_json", {})),
          data.get("oraclebase_id"), data.get("sort_order", 0), exercise_id))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row))


@app.route("/api/lab-exercises/<int:exercise_id>", methods=["DELETE"])
def delete_lab_exercise(exercise_id):
    conn = _get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM lab_exercises WHERE id=%s", (exercise_id,))
    cur.close()
    conn.close()
    return jsonify({"ok": True})


# ── Lab Progress API ─────────────────────────────────────────────────────────

@app.route("/api/lab-progress", methods=["POST"])
def save_lab_progress():
    data = request.get_json()
    if not data or not data.get("username") or not data.get("exercise_id"):
        return jsonify({"error": "username and exercise_id required"}), 400
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        INSERT INTO lab_progress (username, exercise_id, completed, score, answer_json, completed_at)
        VALUES (%s, %s, %s, %s, %s, CASE WHEN %s THEN NOW() ELSE NULL END)
        ON CONFLICT (username, exercise_id) DO UPDATE
        SET completed=EXCLUDED.completed, score=EXCLUDED.score,
            answer_json=EXCLUDED.answer_json,
            completed_at=CASE WHEN EXCLUDED.completed THEN NOW() ELSE lab_progress.completed_at END
        RETURNING *
    """, (data["username"], data["exercise_id"],
          data.get("completed", False), data.get("score"),
          json.dumps(data.get("answer_json")) if data.get("answer_json") else None,
          data.get("completed", False)))
    row = dict(cur.fetchone())
    cur.close()
    conn.close()
    return jsonify(row)


@app.route("/api/lab-progress", methods=["GET"])
def get_lab_progress():
    username = request.args.get("username")
    if not username:
        return jsonify({"error": "username required"}), 400
    conn = _get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM lab_progress WHERE username=%s", (username,))
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(rows)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
