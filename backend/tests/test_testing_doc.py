"""docs/testing.md and the test code must list the same test case IDs."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "docs" / "testing.md"
ID = re.compile(r"TC-US\d{2}-\d{2}")
BACKEND_DEF = re.compile(r"^\s*# (TC-US\d{2}-\d{2})\s*$", re.MULTILINE)
FRONTEND_DEF = re.compile(r"""\btest\(\s*["'`](TC-US\d{2}-\d{2})\b""")


def _read(path):
    return path.read_text(encoding="utf-8")


def _backend_files():
    return sorted((ROOT / "backend" / "tests").glob("*.py"))


def _frontend_files():
    return sorted((ROOT / "frontend" / "tests").glob("*.test.js"))


def _defined_ids():
    """Every ID defined by a test, one entry per definition (duplicates kept)."""
    found = []
    for path in _backend_files():
        found += BACKEND_DEF.findall(_read(path))
    for path in _frontend_files():
        found += FRONTEND_DEF.findall(_read(path))
    return found


def _doc_ids():
    return set(ID.findall(_read(DOC)))


# TC-US09-37
def test_testing_md_exists_and_lists_ids():
    assert DOC.is_file(), f"{DOC} is missing"
    assert _backend_files() and _frontend_files()
    assert len(_doc_ids()) >= 20


def test_every_id_in_testing_md_is_defined_by_a_test():
    defined = set(_defined_ids())
    missing = sorted(_doc_ids() - defined)
    assert not missing, f"IDs in testing.md with no test: {missing}"


def test_every_test_id_is_listed_in_testing_md():
    missing = sorted(set(_defined_ids()) - _doc_ids())
    assert not missing, f"test IDs missing from testing.md: {missing}"


def test_no_test_id_is_defined_twice():
    ids = _defined_ids()
    duplicates = sorted({i for i in ids if ids.count(i) > 1})
    assert not duplicates, f"IDs defined more than once: {duplicates}"


def test_every_section_two_case_is_a_pytest_case():
    """M4's core table must run entirely with pytest; JS stays supplementary."""
    section = re.search(r"^## 2\..*?\n(.*?)(?=^## 3\.)", _read(DOC), re.MULTILINE | re.DOTALL)
    assert section is not None, "testing.md must have ordered sections 2 and 3"
    case_ids = set(ID.findall(section.group(1)))
    assert case_ids, "section 2 must list test cases"
    backend_ids = {
        case_id
        for path in _backend_files()
        for case_id in BACKEND_DEF.findall(_read(path))
    }
    missing = sorted(case_ids - backend_ids)
    assert not missing, f"section 2 IDs without a pytest test: {missing}"
