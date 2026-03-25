import json
import os
import urllib.parse
import urllib.request
from flask import Flask, request, jsonify, render_template
import sqlglot
import sqlglot.errors

app = Flask(__name__)

# ── Persistent storage via Replit KV (survives deployments) ──────────────────

_KV_URL = os.environ.get("REPLIT_DB_URL")

# Fall back to local files when running outside Replit (dev mode)
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
UNLOCKS_FILE = os.path.join(DATA_DIR, "tab_unlocks.json")
os.makedirs(DATA_DIR, exist_ok=True)


def _kv_get(key, default):
    """Read a JSON value from Replit KV."""
    try:
        url = f"{_KV_URL}/{urllib.parse.quote(key, safe='')}"
        with urllib.request.urlopen(url) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return default
        raise
    except Exception:
        return default


def _kv_set(key, value):
    """Write a JSON value to Replit KV."""
    encoded = urllib.parse.urlencode({key: json.dumps(value)}).encode()
    req = urllib.request.Request(_KV_URL, data=encoded, method="POST")
    with urllib.request.urlopen(req):
        pass


def read_json(path, default, kv_key=None):
    if _KV_URL and kv_key:
        return _kv_get(kv_key, default)
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def write_json(path, data, kv_key=None):
    if _KV_URL and kv_key:
        _kv_set(kv_key, data)
        return
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


# ── User management ──────────────────────────────────────────────────────────

@app.route("/api/users", methods=["GET"])
def get_users():
    users = read_json(USERS_FILE, [], kv_key="users")
    # Strip hashes before sending to client
    return jsonify([{k: v for k, v in u.items() if k != "hash"} for u in users])


@app.route("/api/users", methods=["POST"])
def create_user():
    data = request.get_json()
    if not data or not data.get("username") or not data.get("hash"):
        return jsonify({"error": "username and hash are required"}), 400
    users = read_json(USERS_FILE, [], kv_key="users")
    if any(u["username"] == data["username"] for u in users):
        return jsonify({"error": "Username already exists"}), 409
    new_user = {
        "username": data["username"],
        "displayName": data.get("displayName") or data["username"],
        "role": data.get("role", "dba"),
        "hash": data["hash"],
    }
    users.append(new_user)
    write_json(USERS_FILE, users, kv_key="users")
    return jsonify({"ok": True})


@app.route("/api/users/<username>", methods=["DELETE"])
def delete_user(username):
    if username == "admin":
        return jsonify({"error": "Cannot delete admin"}), 403
    users = read_json(USERS_FILE, [], kv_key="users")
    users = [u for u in users if u["username"] != username]
    write_json(USERS_FILE, users, kv_key="users")
    # Also clear that user's tab unlocks
    unlocks = read_json(UNLOCKS_FILE, {}, kv_key="tab_unlocks")
    unlocks.pop(username, None)
    write_json(UNLOCKS_FILE, unlocks, kv_key="tab_unlocks")
    return jsonify({"ok": True})


@app.route("/api/users/verify", methods=["POST"])
def verify_user():
    """Verify credentials and return user info (without hash)."""
    data = request.get_json()
    if not data or not data.get("username") or not data.get("hash"):
        return jsonify({"error": "username and hash required"}), 400
    users = read_json(USERS_FILE, [], kv_key="users")
    match = next((u for u in users if u["username"] == data["username"] and u["hash"] == data["hash"]), None)
    if match:
        return jsonify({"username": match["username"], "displayName": match["displayName"], "role": match["role"]})
    return jsonify({"error": "Invalid credentials"}), 401


# ── Tab unlock management ────────────────────────────────────────────────────

@app.route("/api/tab-unlocks", methods=["GET"])
def get_tab_unlocks():
    username = request.args.get("username")
    unlocks = read_json(UNLOCKS_FILE, {}, kv_key="tab_unlocks")
    if username:
        return jsonify(unlocks.get(username, ["standard"]))
    return jsonify(unlocks)


@app.route("/api/tab-unlocks", methods=["POST"])
def set_tab_unlocks():
    data = request.get_json()
    if not data or "username" not in data or "tabs" not in data:
        return jsonify({"error": "username and tabs required"}), 400
    unlocks = read_json(UNLOCKS_FILE, {}, kv_key="tab_unlocks")
    unlocks[data["username"]] = data["tabs"]
    write_json(UNLOCKS_FILE, unlocks, kv_key="tab_unlocks")
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
