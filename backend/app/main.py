from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse, Response

from app import models  # noqa: F401  (registers every table on Base.metadata)
from app.database import engine
from app.migrate import ensure_schema
from app.routers import applications, auth, loans, users
from app.routers.applications import ApplicationIn
from app.routers.auth import LoginIn


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create the tables if they do not exist yet. Doing it at startup (not at import
    # time) keeps `import app.main` free of side effects, which matters for tests.
    ensure_schema(engine)
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
app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(users.router)


FIELD_LABELS = {
    "monthly_income": "Monthly income",
    "loan_amount": "Loan amount",
    "loan_term_months": "Loan term",
    "estimated_monthly_payment": "Estimated monthly payment",
    "purpose": "Loan purpose",
    "credit_history_note": "Credit history",
    "cic_debt_group": "CIC debt group",
    "citizen_id": "Citizen ID",
    "bank_account": "Bank account",
    "email": "Email",
    "password": "Password",
}


# Fields that have no default in a request model: a blank value there means "not given".
REQUIRED_FIELDS = {
    name
    for model in (ApplicationIn, LoginIn)
    for name, info in model.model_fields.items()
    if info.is_required()
}


def _is_blank(value) -> bool:
    return value is None or (isinstance(value, str) and value.strip() == "")


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request, exc):
    errors = {}
    for error in exc.errors():
        location = error["loc"]
        field = str(location[-1]) if len(location) > 1 else "form"
        label = FIELD_LABELS.get(field, "Input")
        kind = error["type"]
        context = error.get("ctx", {})

        if len(location) == 1 and kind in ("missing", "model_attributes_type", "dict_type", "model_type"):
            # The body itself is absent, null, or not an object (array, number, text).
            field = "form"
            message = "The request body must be a JSON object."
        elif kind == "missing" or (
            field in REQUIRED_FIELDS and len(location) > 1 and _is_blank(error.get("input"))
        ):
            message = "Income is required" if field == "monthly_income" else f"{label} is required."
        elif kind == "extra_forbidden":
            message = f"Unknown field '{field}' is not accepted."
        elif kind in ("int_parsing", "int_type", "int_from_float"):
            message = f"{label} must be a whole number."
        elif kind == "greater_than":
            unit = " VND" if field == "monthly_income" else ""
            message = f"{label} must be greater than {context['gt']}{unit}."
        elif kind == "greater_than_equal":
            message = f"{label} must be at least {context['ge']}."
        elif kind == "less_than_equal":
            message = f"{label} must not exceed {context['le']}."
        elif kind == "string_too_long":
            message = f"{label} must not exceed {context['max_length']} characters."
        elif kind == "string_type":
            message = f"{label} must be text."
        elif kind == "value_error":
            # A rule from a field validator (e.g. BR7 identifier format) already
            # carries a message written for the officer; keep it.
            message = str(context.get("error") or f"{label} is invalid.")
        elif kind == "json_invalid":
            field = "form"
            message = "The request contains invalid JSON. Check it and try again."
        else:
            message = f"{label} is invalid. Check its format and try again."
        errors.setdefault(field, message)

    return JSONResponse(
        status_code=422,
        content={
            "detail": "Please correct the highlighted fields and submit again.",
            "errors": errors,
        },
    )


@app.get("/", include_in_schema=False)

def root():
    return RedirectResponse(url="/loan-applications")

@app.get("/favicon.ico", include_in_schema=False)

def favicon():
    return Response(status_code=204)


@app.get("/health")
def health_check():
    return {"status": "ok"}
