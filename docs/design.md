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