# Design — Credit Scoring Demo

## 1. Architecture

![Architecture](images/architecture.png)

| Component | What it is | Status |
| --- | --- | --- |
| **Browser** | Used by employees and managers (phone or computer). | in use |
| **Frontend web app** | React + Vite single-page app for the screens in M1 section 6. | planned (Sprint 3) |
| **Backend API** | FastAPI service. Owns all business logic and enforces BR1-BR8. | built (skeleton) |
| **Database** | SQLite file `credit_scoring.db` in development, PostgreSQL for a real deployment (switched by `DATABASE_URL`). | built |
| **Scoring module** | Runs **inside the API process**, not as a separate service. Loads `model.joblib` once at startup. In: feature vector. Out: integer score 0-100 and a list of explanation strings. | planned (Sprint 4) |
| **Offline training pipeline** | Trains on the German Credit Dataset and writes `model.joblib`. The dataset is never loaded into the database; only runtime data is stored. | planned (Sprint 4) |

Every arrow is labelled with what travels along it. The API reaches the database through a library (SQLAlchemy), not through another API.

## 2. Data model

![ERD](images/erd.png)

Diagram source: `images/erd.dot`. Money columns are whole VND (`BIGINT`), see Decision 3. Enums are stored by value in `VARCHAR`.
Multiplicity: `1 : 0..*` for a required foreign key, `0..1 : 0..*` for a nullable one.

**`users`** - login accounts with two roles.

| Column | Type | Key | Constraint / which rule |
| --- | --- | --- | --- |
| `id` | VARCHAR (UUID) | PK | |
| `email` | VARCHAR NOT NULL | | UNIQUE |
| `hashed_password` | VARCHAR NOT NULL | | |
| `full_name` | VARCHAR NOT NULL | | |
| `role` | VARCHAR(20) NOT NULL | | `user` or `admin` only - **BR8** |
| `failed_login_count` | INTEGER NOT NULL | | default 0 - **US01** (lock after 3 failures) |
| `locked_until` | TIMESTAMPTZ NULL | | **US01** (locked for 15 minutes) |
| `created_at` | TIMESTAMPTZ NOT NULL | | |

**`loan_applications`** - one loan application and its processing state.

| Column | Type | Key | Constraint / which rule |
| --- | --- | --- | --- |
| `id` | VARCHAR (UUID) | PK | |
| `created_by` | VARCHAR NOT NULL | FK -> `users.id` | ON DELETE RESTRICT - **BR8** (every application has an owner) |
| `monthly_income` | BIGINT NOT NULL | | CHECK `> 0` - **BR2** |
| `loan_amount` | BIGINT NOT NULL | | CHECK `> 0` - **BR3** input |
| `loan_term_months` | INTEGER NOT NULL | | CHECK `> 0` - **BR3** input |
| `estimated_monthly_payment` | BIGINT NOT NULL | | CHECK `>= 0` - **BR3** input |
| `credit_history_note` | TEXT NULL | | **US03** |
| `purpose` | VARCHAR NULL | | **US03** |
| `cic_debt_group` | INTEGER NULL | | CHECK 1 to 5 - **BR4** |
| `citizen_id_encrypted` | VARCHAR NULL | | ciphertext only - **BR7** |
| `citizen_id_last4` | VARCHAR(4) NULL | | last 4 digits only - **BR7** |
| `status` | VARCHAR(20) NOT NULL | | `pending`, `scored`, `manual_review`, `rejected`, `cancelled`, `approved` (US03, US10, BR1, BR3, BR4, BR5) |
| `dsr_flag_high_risk` | BOOLEAN NOT NULL | | true when DSR > 50% - **BR3** |
| `created_at` | TIMESTAMPTZ NOT NULL | | indexed - **US08** (daily dashboard) |
| `updated_at` | TIMESTAMPTZ NOT NULL | | |

**`scoring_results`** - one row per scoring attempt, so an application keeps a history (**US06**).

| Column | Type | Key | Constraint / which rule |
| --- | --- | --- | --- |
| `id` | VARCHAR (UUID) | PK | |
| `loan_application_id` | VARCHAR NOT NULL | FK -> `loan_applications.id` | ON DELETE RESTRICT; index with `created_at` to count scorings per hour - **BR5** |
| `score` | INTEGER NULL | | CHECK 0 to 100; NULL when the result was blocked - **BR1**, **BR4** |
| `label` | VARCHAR(20) NULL | | `rejected` (< 40), `review` (40-69), `eligible` (>= 70) - **BR6** |
| `explanation` | JSON NULL | | list of key factors - **US04** |
| `rejected_reason` | VARCHAR NULL | | why it was blocked or rejected - **BR1**, **BR4**, **BR5** |
| `model_version` | VARCHAR NULL | | traceability of the model that produced the score |
| `input_snapshot` | JSON NULL | | the inputs used, so a score can be reproduced |
| `created_at` | TIMESTAMPTZ NOT NULL | | |

**`event_logs`** - audit trail of important actions ("who changed what, and when").

| Column | Type | Key | Constraint / which rule |
| --- | --- | --- | --- |
| `id` | VARCHAR (UUID) | PK | |
| `actor_id` | VARCHAR NULL | FK -> `users.id` | ON DELETE SET NULL (the log outlives the user) |
| `loan_application_id` | VARCHAR NULL | FK -> `loan_applications.id` | ON DELETE SET NULL |
| `action` | VARCHAR NOT NULL | | e.g. `loan.created`, `citizen_id.viewed` - **BR7** (every ID view is logged) |
| `detail` | TEXT NULL | | masked text, never a full citizen ID - **BR7** |
| `created_at` | TIMESTAMPTZ NOT NULL | | |

## 3. API design

Conventions: JSON under the `/api` prefix, `Authorization: Bearer <JWT>` on everything except login, money in whole VND,
errors as `{"detail": "<message>"}`. This is the design for the whole product; in M2 only the page in section 4 is built.
The order of checks when an application is submitted and scored is: BR2 (income > 0) -> save -> BR3 (set the high-risk flag) -> BR4 (bad-debt
group: reject, model not called) -> BR5 (3 scorings per hour) -> model -> BR1 (score range) -> BR6 (label).

| Method | Path | Input | Success | Error codes | Covers |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | email, password | 200 + JWT | 401 wrong credentials; 422 invalid body; **423** account locked (US01, 15 min) | US01 (P0) |
| POST | `/api/loan-applications` | monthly_income, loan_amount, loan_term_months, estimated_monthly_payment, credit_history_note, purpose, cic_debt_group?, citizen_id? | 201 + application (`pending`, high-risk flag set if DSR > 50%) | 401; **422** missing or malformed field ("Income is required") or income <= 0 | US03, US09 (P0); BR2, BR3 |
| GET | `/api/loan-applications` | - | 200 + list (User: own only; Admin: all) | 401 | US05 list (P1); BR8 |
| GET | `/api/loan-applications/{id}` | - | 200 + data, score, explanation | 401; **403** not the owner; **404** "Application not found" | US05; BR8 |
| PATCH | `/api/loan-applications/{id}` | fields to change | 200 + application | 401; 403; 404; **409** "Application already processed, cannot be edited"; 422 | US10 (P1) |
| PATCH | `/api/loan-applications/{id}/cancel` | - | 200 + cancelled application | 401; 403; 404; 409 already processed | US10 (P1) |
| POST | `/api/loan-applications/{id}/score` | - | 201 + score, label, explanation | 401; 403; 404; 409 cancelled or approved; **429** BR5 limit reached (application becomes `manual_review`) | US04 (P0); BR1, BR3-BR6 |
| GET | `/api/loan-applications/{id}/scores` | - | 200 + history (empty list shown as "No history available") | 401; 403; 404 | US06 (P1) |
| GET | `/api/dashboard/summary` | - | 200 + today's `total_applications` and `average_score` (null when none) | 401 | US08 (P0) |

Not designed yet (P2, or tied to Sprint 4 encryption): logout (US02), notifications (US07), account management (`/admin/users`), the citizen-ID lookup (BR7).

## 4. Walking skeleton

**Route:** `GET /loan-applications` - returns an HTML page, opened directly in the browser, no login yet.
**Table it reads:** `loan_applications`, created and seeded with **12 rows** by `python -m app.seed` (M2 asks for at least 10).
Settings live in `backend/.env.example` (only `DATABASE_URL`); the real `.env` is never committed. Install steps: `SETUP.md`.

![Running page](images/walking-skeleton.png)

The query behind the page (SQLAlchemy, and the SQL it runs):

```python
rows = db.query(LoanApplication).order_by(LoanApplication.created_at.desc()).all()
```

```sql
SELECT * FROM loan_applications ORDER BY created_at DESC;
```

The data comes from the database, not from an array in the code. The test `test_route_reads_the_database_not_a_hardcoded_list`
proves it: it inserts one row, calls the page again, and exactly one more row appears.
Known limits: no authentication yet, so BR8 filtering is not applied; the page escapes all text it reads from the database.
The JSON API lives under `/api`, so the final React page can use the M1 screen route `/loan-applications` without a clash.


## 5. Design decisions (ADR)

### Decision 1 - SQLite instead of PostgreSQL for the walking skeleton

**Options:** SQLite file - PostgreSQL in Docker - MySQL.

**Chose:** SQLite.

**Why:** the instructor must run the project in minutes on a machine that has never seen it. PostgreSQL adds Docker or a database service to SETUP.md, and every extra step is a chance to fail for reasons unrelated to our code. SQLite is one file created by `python -m app.seed`, and the tests run on an in-memory SQLite database. All access goes through SQLAlchemy, with only generic column types, so switching is a change of `DATABASE_URL` in `.env`.

**What would change our mind:** the BR5 limit (3 scorings per hour) needs a count-then-insert that stays correct under concurrent requests. If two simultaneous `POST /score` calls for the same application can both pass the check in testing, SQLite's file-level write lock is not enough and we move to PostgreSQL in Sprint 4. We would also move for a real deployment with several users writing at once.


