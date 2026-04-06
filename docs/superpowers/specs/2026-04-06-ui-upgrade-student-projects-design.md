# Design Spec: UI Upgrade + Student Projects

**Date:** 2026-04-06
**Status:** Approved
**Scope:** Navigation upgrade, content enhancement, and a new `/projects` hub with Assignment Bank, Student Showcase, and Guided Labs

---

## Overview

sql2oracle is an Oracle DBA training platform. This upgrade has two goals:

1. **UI & content upgrade** — unified navigation bar across all pages, richer educational content drawn from the oracle_12c_admin_complete_notes.md file, a visual refresh of the SQL converter and architecture pages, and embedded oraclebase.com article summaries.
2. **Student Projects hub** — a new `/projects` page with three tabs: Assignment Bank, Student Showcase, and Guided Labs. All content is admin-managed in-app.

---

## 1. Navigation Upgrade

### Current state
Each page has an independent header with a single hardcoded link. No user info. No logout.

### New nav bar
A unified `<header>` component rendered on every page (`index.html`, `architecture.html`, `projects.html`) with:

- **Logo** — existing svg + "sql2oracle" wordmark
- **Nav links** — Architecture | SQL Converter | Projects (each a link, active state highlighted)
- **Tab unlock enforcement** — nav items are hidden (not just disabled) if the user's `tab_unlocks` entry doesn't include that tab's key
  - `architecture` — always visible (default tab for all roles)
  - `sql_converter` — gated, existing logic
  - `projects` — gated, new `projects` tab key
- **User chip** — shows `displayName` + green online dot, pulled from `sessionStorage`
- **Sign Out button** — clears `ora_auth_session_v2` from sessionStorage and redirects to `/`
- **Mobile** — nav collapses to a hamburger menu at < 900px, same links in a slide-down panel

The nav bar is implemented as a shared JS snippet (`static/nav.js`) injected into each page's `<header>` element after DOM load, so it doesn't need to be duplicated across templates.

---

## 2. Content Upgrade

### SQL Converter page (`/sql`)
The existing "Supported Conversions" info cards are replaced with richer cards sourced from `oracle_12c_admin_complete_notes.md`:
- **Data Types** — existing content, expanded with Oracle-specific type nuances (CHAR vs VARCHAR2, NVARCHAR2, CLOB/BLOB)
- **Functions** — existing + NVL2, DECODE, NULLIF, TO_DATE format masks
- **Syntax** — existing + MERGE statement, CONNECT BY hierarchical queries, PIVOT/UNPIVOT
- **Source Dialects** — existing, unchanged
- **Quick Tips** — new card: common gotchas when migrating from MySQL/MSSQL to Oracle (DUAL table, sequence syntax, case sensitivity)

### Architecture page (`/architecture`)
No structural changes to the interactive diagram. A small "Reference" panel is added below the diagram with 3–4 oraclebase.com article cards (fetched and cached), linking out to deeper reading on SGA, background processes, and redo logs.

---

## 3. oraclebase.com Integration

### Strategy
Server-side fetch + PostgreSQL cache. No dynamic proxy at page-load time.

### New DB table: `oraclebase_cache`

```sql
CREATE TABLE oraclebase_cache (
    id          SERIAL PRIMARY KEY,
    url         TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    summary     TEXT NOT NULL,
    topic       TEXT NOT NULL,
    cached_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Fetch mechanism
- New Flask route `POST /api/admin/oraclebase-fetch` — accepts `{ url, topic }`, fetches the page with `requests`, extracts title + first 2–3 paragraphs of body text using `BeautifulSoup`, stores in `oraclebase_cache`.
- Admin triggers this manually from the Exercise Builder UI via "Attach oraclebase.com Reference — Fetch & Cache" button.
- Cached entries are displayed inline in lab exercises and on the architecture reference panel.
- Cache TTL: no automatic expiry. Admin can re-fetch to refresh stale entries.

### Dependencies added to `pyproject.toml`
- `requests`
- `beautifulsoup4`
- `lxml` (parser)

---

## 4. Projects Hub (`/projects`)

### Route
`GET /projects` — renders `templates/projects.html`. Access-gated: requires `projects` in `tab_unlocks` (or admin/manager role).

### Tab structure
Three tabs rendered client-side in a single page, no page reloads:

| Tab | Key | Description |
|-----|-----|-------------|
| Assignments | `assignments` | Assignment bank — cards of DBA project briefs |
| Showcase | `showcase` | Student submission gallery |
| Labs | `labs` | Guided exercises by topic |

Tab state is stored in `sessionStorage` so the last-viewed tab is remembered.

---

## 5. Assignment Bank

### Data model

```sql
CREATE TABLE assignments (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    topic       TEXT NOT NULL,
    difficulty  TEXT NOT NULL CHECK (difficulty IN ('beginner','intermediate','advanced')),
    due_date    DATE,
    created_by  TEXT NOT NULL REFERENCES users(username),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Student view
- Grid of cards, each showing: topic badge (color-coded by topic), title, truncated description, difficulty badge, due date
- Topics: Data Guard, RAC, Performance Tuning, Partitioning, Indexes, Backup & Recovery, Security, High Availability
- Clicking a card expands a detail panel with full description

### Admin view (role = admin or manager)
- "+ New Assignment" button opens an inline form above the grid
- Each card shows Edit / Delete controls
- Edit opens the same inline form pre-populated
- Delete shows a confirmation prompt before removing

### API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/assignments` | List all assignments |
| POST | `/api/assignments` | Create (admin only) |
| PUT | `/api/assignments/<id>` | Update (admin only) |
| DELETE | `/api/assignments/<id>` | Delete (admin only) |

---

## 6. Student Showcase

### Data model

```sql
CREATE TABLE showcase_entries (
    id              SERIAL PRIMARY KEY,
    student_username TEXT NOT NULL REFERENCES users(username),
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    url             TEXT,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved        BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by     TEXT REFERENCES users(username),
    approved_at     TIMESTAMPTZ
);
```

### Student view
- "+ Submit Your Work" button opens a form: title, description, optional URL (GitHub, Google Doc, etc.)
- After submission, student sees their entry in the gallery with a "Pending Review" badge
- Approved entries show no badge — they appear as published cards

### Admin view
- A yellow warning banner at the top of the tab when there are pending entries: "N submission(s) pending approval"
- Each pending card has Approve / Reject controls
- Approved entries can be un-published (returns to pending)

### Gallery layout
- 3-column grid of cards
- Each card: emoji/icon area (auto-assigned by topic keyword in title), student name, date, title, description excerpt, status badge
- Published entries are visible to all users; pending entries are visible only to the submitting student and admins

### API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/showcase` | List entries (approved only for students; all for admin) |
| POST | `/api/showcase` | Submit entry (any logged-in user) |
| PUT | `/api/showcase/<id>/approve` | Approve (admin only) |
| DELETE | `/api/showcase/<id>` | Delete (admin or entry owner) |

---

## 7. Guided Labs

### Data model

```sql
CREATE TABLE lab_topics (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    icon        TEXT NOT NULL DEFAULT '📚',
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE lab_exercises (
    id              SERIAL PRIMARY KEY,
    topic_id        INTEGER NOT NULL REFERENCES lab_topics(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN ('quiz','scenario','written','flashcard')),
    title           TEXT NOT NULL,
    content_json    JSONB NOT NULL,
    oraclebase_id   INTEGER REFERENCES oraclebase_cache(id),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_by      TEXT NOT NULL REFERENCES users(username),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lab_progress (
    username        TEXT NOT NULL REFERENCES users(username),
    exercise_id     INTEGER NOT NULL REFERENCES lab_exercises(id) ON DELETE CASCADE,
    completed       BOOLEAN NOT NULL DEFAULT FALSE,
    score           INTEGER,
    answer_json     JSONB,
    completed_at    TIMESTAMPTZ,
    PRIMARY KEY (username, exercise_id)
);
```

### Exercise content_json schemas

**Quiz:**
```json
{
  "question": "string",
  "options": ["string", ...],
  "correct": 0,
  "explanation": "string"
}
```

**Scenario:**
```json
{
  "intro": "string",
  "steps": [
    {
      "text": "string",
      "choices": [
        { "label": "string", "next": 1, "feedback": "string" }
    // next: 0-based index into steps array, or null to end the scenario
      ]
    }
  ]
}
```

**Written:**
```json
{
  "prompt": "string",
  "guidance": "string (shown after submission)"
}
```

**Flashcard:**
```json
{
  "cards": [
    { "front": "string", "back": "string" }
  ]
}
```

### Student view — Lab topics page
- Grid of topic cards, each showing: icon, title, exercise count + format types, progress bar (% of exercises completed for that topic)
- Clicking a topic opens the exercise list for that topic
- oraclebase.com reference card shown on each topic (if an article is attached)

### Student view — Exercise
- Breadcrumb: Labs > Topic > Exercise title
- Exercise rendered based on type:
  - **Quiz** — question + 4 options, submit shows correct/wrong + explanation + oraclebase reference
  - **Scenario** — branching decision tree, each step reveals consequences and next choices
  - **Written** — textarea + Submit for Review; admin can view and mark as reviewed (no comment thread — feedback is out-of-band)
  - **Flashcard** — flip animation, self-mark "I know this" / "Review again", deck progress
- Next / Previous exercise navigation within the topic

### Admin view — Exercise Builder
Inline form in the Labs tab (visible to admin/manager only):
- Topic selector
- Exercise type selector (changes the content_json template shown)
- Title field
- Content JSON textarea (pre-populated with the correct schema template for the selected type)
- "Attach oraclebase.com Reference" button — opens a small form to enter a URL, triggers `/api/admin/oraclebase-fetch`, stores the returned cache ID on the exercise
- Save / Cancel

### API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lab-topics` | List topics with progress for current user |
| GET | `/api/lab-topics/<id>/exercises` | List exercises for a topic |
| GET | `/api/lab-exercises/<id>` | Get single exercise |
| POST | `/api/lab-topics` | Create topic (admin) |
| POST | `/api/lab-exercises` | Create exercise (admin) |
| PUT | `/api/lab-exercises/<id>` | Update exercise (admin) |
| DELETE | `/api/lab-exercises/<id>` | Delete exercise (admin) |
| POST | `/api/lab-progress` | Save progress `{ exercise_id, completed, score, answer_json }` |
| GET | `/api/lab-progress?username=X` | Get all progress for user |
| POST | `/api/admin/oraclebase-fetch` | Fetch + cache article (admin) |

---

## 8. Database Migration

All new tables are created in `_init_db()` in `app.py` using `CREATE TABLE IF NOT EXISTS`. No destructive changes to existing tables. Migration order:

1. `oraclebase_cache`
2. `assignments`
3. `showcase_entries`
4. `lab_topics`
5. `lab_exercises`
6. `lab_progress`

---

## 9. File Changes Summary

| File | Change |
|------|--------|
| `app.py` | Add all new API routes, extend `_init_db()`, add `requests`/`bs4` import |
| `static/nav.js` | New — shared nav bar renderer |
| `static/style.css` | Add nav bar styles, projects page styles, lab exercise styles |
| `templates/index.html` | Replace header with shared nav, enrich info cards |
| `templates/architecture.html` | Replace header with shared nav, add reference panel |
| `templates/projects.html` | New page — full projects hub with 3 tabs |
| `pyproject.toml` | Add `requests`, `beautifulsoup4`, `lxml` |
| `CLAUDE.md` | Update routes table to include `/projects` |

---

## 10. Access Control Summary

| Feature | Admin | Manager | DBA | Student | Viewer |
|---------|-------|---------|-----|---------|--------|
| View assignments | ✓ | ✓ | ✓ (if unlocked) | ✓ (if unlocked) | ✗ |
| Create/edit/delete assignments | ✓ | ✓ | ✗ | ✗ | ✗ |
| View showcase (published) | ✓ | ✓ | ✓ (if unlocked) | ✓ (if unlocked) | ✗ |
| Submit showcase entry | ✓ | ✓ | ✓ | ✓ | ✗ |
| Approve showcase | ✓ | ✓ | ✗ | ✗ | ✗ |
| View + take labs | ✓ | ✓ | ✓ (if unlocked) | ✓ (if unlocked) | ✗ |
| Create/edit lab exercises | ✓ | ✓ | ✗ | ✗ | ✗ |
| Fetch oraclebase content | ✓ | ✓ | ✗ | ✗ | ✗ |

The `projects` tab unlock key must be granted by admin via the existing `/api/tab-unlocks` endpoint.

---

## 11. Out of Scope

- Email notifications for showcase approvals
- Student-to-student comments on showcase entries
- Lab scoring leaderboard
- Automatic oraclebase.com cache refresh / scheduled crawl
- Oracle SQL execution sandbox for labs (labs are knowledge-based, not SQL execution)
