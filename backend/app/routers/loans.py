import html

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import LoanApplication

router = APIRouter(tags=["walking-skeleton"])


def _row_html(r: LoanApplication) -> str:
    esc = html.escape
    owner = esc(r.created_by_user.full_name) if r.created_by_user else "-"
    high_risk = '<td class="high-risk">Yes</td>' if r.dsr_flag_high_risk else "<td>No</td>"
    return (
        '<tr class="loan-row">'
        f"<td>{esc(r.id[:8])}</td>"
        f"<td>{owner}</td>"
        f"<td>{r.monthly_income:,}</td>"
        f"<td>{r.loan_amount:,}</td>"
        f"<td>{r.loan_term_months}</td>"
        f"<td>{r.estimated_monthly_payment:,}</td>"
        f"<td>{esc(r.purpose or '')}</td>"
        f"<td>{esc(r.status.value)}</td>"
        f"{high_risk}"
        "</tr>"
    )


@router.get("/loan-applications", response_class=HTMLResponse)
def list_loan_applications(db: Session = Depends(get_db)):
    rows = (
        db.query(LoanApplication)
        .options(joinedload(LoanApplication.created_by_user))
        .order_by(LoanApplication.created_at.desc(), LoanApplication.id)
        .all()
    )

    if rows:
        table = (
            '<table border="1" cellpadding="6" style="border-collapse: collapse;">'
            "<tr><th>ID</th><th>Owner</th><th>Monthly income (VND)</th>"
            "<th>Loan amount (VND)</th><th>Term (months)</th>"
            "<th>Est. monthly payment (VND)</th><th>Purpose</th>"
            "<th>Status</th><th>High risk (DSR &gt; 50%)</th></tr>"
            + "".join(_row_html(r) for r in rows)
            + "</table>"
        )
    else:
        table = "<p>No loan applications yet.</p>"

    page = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Loan applications</title>
    <style>.high-risk {{ color: #b00020; font-weight: bold; }}</style>
  </head>
  <body style="font-family: sans-serif; padding: 24px;">
    <h1>Loan applications ({len(rows)})</h1>
    <p>Read directly from the <code>loan_applications</code> table in the database.</p>
    {table}
  </body>
</html>"""
    return HTMLResponse(content=page)
