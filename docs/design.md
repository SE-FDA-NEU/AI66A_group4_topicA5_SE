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