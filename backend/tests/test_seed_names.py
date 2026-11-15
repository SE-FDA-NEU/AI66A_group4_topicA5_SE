from app.models import LoanApplication
from app.seed import APPLICANT_NAMES, LOANS, seed_database


def _names(db):
    return sorted(row.application_name for row in db.query(LoanApplication))


def test_fresh_seed_uses_vietnamese_names(seeded):
    assert _names(seeded) == sorted(APPLICANT_NAMES)
    assert len(APPLICANT_NAMES) == len(LOANS)


def test_reseed_renames_placeholder_names_only(seeded):
    rows = seeded.query(LoanApplication).order_by(LoanApplication.created_at).all()
    rows[0].application_name = "Loan application"
    rows[1].application_name = f"Application {rows[1].id[:8]}"
    rows[2].application_name = "Hồ sơ do người dùng đặt"
    seeded.commit()

    seed_database(seeded)

    names = {row.id: row.application_name for row in seeded.query(LoanApplication)}
    assert sorted(names.values()).count("Hồ sơ do người dùng đặt") == 1
    assert not any(n == "Loan application" or n.startswith("Application ") for n in names.values())
