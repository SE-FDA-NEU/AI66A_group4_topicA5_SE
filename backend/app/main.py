from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import models  # noqa: F401  (registers every table on Base.metadata)
from app.database import Base, engine
from app.routers import loans
from fastapi.responses import RedirectResponse, Response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create the tables if they do not exist yet. Doing it at startup (not at import
    # time) keeps `import app.main` free of side effects, which matters for tests.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Credit Scoring Demo",
    description=(
        "M2 walking skeleton. Only one real route exists (GET /loan-applications); "
        "the rest of the API in docs/design.md is implemented in Sprints 3-4."
    ),
    version="0.2.0",
    lifespan=lifespan,
)

app.include_router(loans.router)

@app.get("/", include_in_schema=False)

def root():
    return RedirectResponse(url="/loan-applications")

@app.get("/favicon.ico", include_in_schema=False)

def favicon():
    return Response(status_code=204)


@app.get("/health")
def health_check():
    return {"status": "ok"}
