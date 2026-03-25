const EXAMPLES = [
    `-- MySQL example
SELECT u.id, u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= NOW() - INTERVAL 30 DAY
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 0
LIMIT 50;`,

    `-- PostgreSQL example
SELECT
    e.department,
    AVG(e.salary) AS avg_salary,
    STRING_AGG(e.name, ', ' ORDER BY e.name) AS employees
FROM employees e
WHERE e.active = TRUE
GROUP BY e.department
ORDER BY avg_salary DESC;`,

    `-- SQL Server example
SELECT TOP 10
    p.product_name,
    p.price,
    ISNULL(p.discount, 0) AS discount
FROM products p
WHERE p.category = N'Electronics'
ORDER BY p.price DESC;`,
];

let exampleIndex = 0;

async function loadDialects() {
    try {
        const res = await fetch("/dialects");
        const dialects = await res.json();
        const sel = document.getElementById("source-dialect");
        sel.innerHTML = dialects
            .map(d => `<option value="${d.value}">${d.label}</option>`)
            .join("");
    } catch (e) {
        console.error("Failed to load dialects", e);
    }
}

function highlightSQL(code) {
    if (typeof hljs !== 'undefined') {
        try {
            return hljs.highlight(code, { language: 'sql' }).value;
        } catch (e) {}
    }
    return escapeHTML(code);
}

function escapeHTML(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function convertSQL() {
    const sql = document.getElementById("sql-input").value.trim();
    const source = document.getElementById("source-dialect").value;
    const outputArea = document.getElementById("output-area");
    const errorBanner = document.getElementById("error-banner");
    const convertBtn = document.getElementById("convert-btn");
    const copyBtn = document.getElementById("copy-btn");
    const stmtCount = document.getElementById("stmt-count");

    errorBanner.style.display = "none";
    outputArea.classList.remove("has-result");

    if (!sql) {
        errorBanner.textContent = "Please enter some SQL to convert.";
        errorBanner.style.display = "block";
        return;
    }

    convertBtn.disabled = true;
    convertBtn.innerHTML = "Converting\u2026";
    outputArea.innerHTML = '<span class="placeholder-text">Converting\u2026</span>';
    copyBtn.style.display = "none";
    stmtCount.style.display = "none";

    try {
        const res = await fetch("/convert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sql, source }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            errorBanner.textContent = data.error || "An unexpected error occurred.";
            errorBanner.style.display = "block";
            outputArea.innerHTML = '<span class="placeholder-text">Converted Oracle SQL will appear here\u2026</span>';
        } else {
            outputArea.innerHTML = '<pre><code class="hljs language-sql">' + highlightSQL(data.result) + '</code></pre>';
            outputArea.classList.add("has-result");
            copyBtn.style.display = "inline-flex";
            if (data.statements > 1) {
                stmtCount.textContent = `${data.statements} statements`;
                stmtCount.style.display = "inline-flex";
            }
        }
    } catch (e) {
        errorBanner.textContent = "Network error. Please try again.";
        errorBanner.style.display = "block";
        outputArea.innerHTML = '<span class="placeholder-text">Converted Oracle SQL will appear here\u2026</span>';
    } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = "Convert \u2192";
    }
}

function copyOutput() {
    const code = document.querySelector("#output-area code");
    const text = code ? code.textContent : document.getElementById("output-area").textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById("copy-btn");
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy"; }, 2000);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadDialects();

    document.getElementById("convert-btn").addEventListener("click", convertSQL);

    document.getElementById("copy-btn").addEventListener("click", copyOutput);

    document.getElementById("clear-btn").addEventListener("click", () => {
        document.getElementById("sql-input").value = "";
        document.getElementById("output-area").innerHTML = '<span class="placeholder-text">Converted Oracle SQL will appear here\u2026</span>';
        document.getElementById("output-area").classList.remove("has-result");
        document.getElementById("error-banner").style.display = "none";
        document.getElementById("copy-btn").style.display = "none";
        document.getElementById("stmt-count").style.display = "none";
    });

    document.getElementById("example-btn").addEventListener("click", () => {
        document.getElementById("sql-input").value = EXAMPLES[exampleIndex % EXAMPLES.length];
        exampleIndex++;
    });

    document.getElementById("sql-input").addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            convertSQL();
        }
    });
});
