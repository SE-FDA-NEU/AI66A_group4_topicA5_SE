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

| Table | Purpose | Columns (PK/FK, type) | Corresponding business rule (from M1) |
| --- | --- | --- | --- |
| `users` | Stores login accounts with 2 roles: User/Admin | PK `id`, `email` UNIQUE, `hashed_password`, `full_name`, `role` enum, `failed_login_count`, `locked_until` | BR8 (authorization); US01 AC2 (account lockout) through `failed_login_count`/`locked_until` |
| `loan_applications` | Stores a loan application and its processing status | PK `id`, FK `created_by`→users.id, `monthly_income`, `loan_amount`, `loan_term_months`, `estimated_monthly_payment`, `cic_debt_group` NULL, `citizen_id_encrypted` NULL, `status` enum, `dsr_flag_high_risk` bool | BR2 (income > 0, enforced at the API layer), BR3 (DSR → `dsr_flag_high_risk`), BR4 (`cic_debt_group`), BR7 (`citizen_id_encrypted` must not store plaintext data) |
| `scoring_results` | Stores each scoring attempt — one application can have multiple rows for scoring history (US06) | PK `id`, FK `loan_application_id`, `score` int NULL, `label` string NULL, `explanation` text, `rejected_reason` string NULL, `created_at` | BR1 (`score` is NULL when outside [0,100]), BR4 (`rejected_reason`=`cic_bad_debt_group`), BR5 (`rejected_reason`=`rate_limited...`), BR6 (`label`) |
| `event_logs` | Logs all important actions for auditing purposes | PK `id`, FK `actor_id`→users.id NULL, FK `loan_application_id` NULL, `action`, `detail` text (masked), `created_at` | BR7 — `detail` must never contain the full Citizen ID number, only the last 4 digits |

The ERD and the table are consistent — 4 tables, sufficient for the minimum required data model.