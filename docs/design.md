# Design — Credit Scoring Demo

## 1. Architecture

![Architecture](images/architecture.png)

5 components:

- **Browser** — Used by loan officers / managers (mobile or desktop).
- **Frontend web app** — Not yet implemented in M2; scheduled for Sprint 3 (M3). Currently, the walking skeleton pathway is tested directly via API / Swagger UI (`/docs`).
- **Backend API** — FastAPI, handling all domain logic and business rules.
- **Database** — SQLite during development (single file `credit_scoring.db`), can be switched to PostgreSQL via the `DATABASE_URL` environment variable for production deployment.
- **ML Model service** — Runs in the same process as the API (not an isolated service), loading the model once upon startup.

Each arrow in the diagram explicitly indicates the transmitted data (HTTP/HTTPS JSON, SQL, feature vector, JWT in header).

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

## 3. API Design

> The table below represents the **complete API design for the entire product**. In M2, only the `GET /loan-applications` endpoint (the walking skeleton route, see Section 4) has been implemented. The remaining endpoints will be implemented in Sprint 3 (authentication) and Sprint 4 (scoring and business rules).

| Method | Path | Input | Success | Error codes |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | email, password, full_name, role | 201 + user | 400 (email already exists), 422 (validation error) |
| POST | `/auth/login` | email, password | 200 + JWT | 401 (incorrect email/password), 423 (account locked — BR/US01 AC2) |
| POST | `/loan-applications` | monthly_income, loan_amount, loan_term_months, estimated_monthly_payment, cic_debt_group?, citizen_id? | 201 + application | 401 (not authenticated), 422 (income ≤ 0 — BR2) |
| GET | `/loan-applications` | (JWT) | 200 + application list (filtered according to BR8) | 401 |
| GET | `/loan-applications/{id}` | (JWT) | 200 + application details | 403 (unauthorized access — BR8), 404 (not found) |
| PATCH | `/loan-applications/{id}/cancel` | (JWT) | 200 + cancelled application | 400 (application already processed and cannot be cancelled), 403, 404 |
| POST | `/loan-applications/{id}/score` | (JWT) | 201 + scoring result or blocking reason | 400 (application already cancelled), 403, 404 |
| GET | `/loan-applications/{id}/scores` | (JWT) | 200 + scoring history | 403, 404 |

8 endpoints (≥6 as required), with at least 2 different error codes used in the design (400/401/403/404/422/423).

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