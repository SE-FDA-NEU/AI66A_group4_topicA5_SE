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