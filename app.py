from flask import Flask, request, jsonify, render_template
import sqlglot
import sqlglot.errors

app = Flask(__name__)


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
