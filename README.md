# Credit Scoring Demo

## Team

* **Product Owner (PO):** Đỗ Quang Trung
* **Scrum Master (Sprint 1):** Trịnh Đức Thành
* **Scrum Master (Sprint 2):** Vu Ngoc Hai
* Members: Đỗ Quang Trung, Trịnh Đức Thành, Vũ Ngọc Hải, Nguyễn Quang Huy

## Project Board

🔗 [GitHub Project Board](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE.git)

## Definition of Done

🔗 See the full details at [`docs/definition-of-done.md`](docs/definition-of-done.md) — all 8 required criteria must be satisfied; none may be skipped.

## Traceability

🔗 Screen → feature → issue → PR: see [`docs/traceability.md`](docs/traceability.md)

## Setup

```bash
git clone <this-repo-url>
cd <repo-name>
```

## Folder Structure

```text
/backend
 - backend/
   - pytest.ini
   - requirements.txt
   - app/
     - __init__.py
     - config.py
     - database.py
     - main.py
     - models.py
     - seed.py
     - routers/
       - __init__.py
       - loans.py
   - tests/
     - conftest.py
     - test_models.py
     - test_walking_skeleton.py
 - frontend/
 - docs/
   - requirements.md
   - sprint-log.md          (includes retrospective + attendance for each sprint)
   - definition-of-done.md
   - traceability.md
   - images/
```

## Backend (quick start)

- Recommended: Python 3.10+.
- From the project root, change to the backend folder and create a virtual environment:

```powershell
cd backend
python -m venv .venv
\# PowerShell: activate
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& ".\.venv\Scripts\Activate.ps1")
\# Or on cmd.exe:
\.venv\Scripts\activate.bat
\# Or on Unix/macOS:
source .venv/bin/activate
```

- Install dependencies and run the FastAPI app with `uvicorn`:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- The API will be available at `http://127.0.0.1:8000` and OpenAPI docs at `/docs`.

## Tests

- From the `backend` folder (virtualenv active):

```bash
pytest
```

## Docs

- Design and requirements are in the `docs/` folder. See `docs/design.md` and `docs/requirements.md` for more details.
