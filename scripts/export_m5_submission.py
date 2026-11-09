"""Export the one-page submission; final mode checks real deployment evidence."""
import argparse
import json
import urllib.error
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]


def get_json(url):
    request = urllib.request.Request(url, headers={"User-Agent":"Team04-M5-verification", "Accept":"application/vnd.github+json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def verify(meta):
    errors = []
    for name in ("running_app","release_v1_0","deployed_commit","latest_green_ci_on_main","branch_protection_screenshot"):
        if not meta.get(name):
            errors.append(name + " is missing")
    for member in meta["members"]:
        if not member.get("student_id"):
            errors.append("Student ID missing for " + member["name"])
    if len(meta.get("merged_m5_prs", [])) < 4:
        errors.append("At least four actual merged M5 PR numbers are required")
    if errors:
        raise ValueError("; ".join(errors))
    url = meta["running_app"].rstrip("/")
    if not url.startswith("https://"):
        raise ValueError("Running app must be public HTTPS")
    with urllib.request.urlopen(url + "/health", timeout=90) as response:
        assert response.status == 200 and json.load(response)["status"] == "ok", "Public health failed"
        assert response.headers.get("X-App-Commit") == meta["deployed_commit"], "Live commit mismatch"
    repo = meta["repository"].rstrip("/")
    assert repo == "https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE", "Unexpected repository"
    api = "https://api.github.com/repos/SE-FDA-NEU/AI66A_group4_topicA5_SE"
    assert meta["release_v1_0"] == repo + "/releases/tag/v1.0", "Wrong v1.0 URL"
    get_json(api + "/releases/tags/v1.0")
    target = get_json(api + "/git/ref/tags/v1.0")["object"]
    if target["type"] == "tag":
        target = get_json(api + "/git/tags/" + target["sha"])["object"]
    assert target["sha"] == meta["deployed_commit"], "v1.0 is not the deployed commit"
    prefix = repo + "/actions/runs/"
    run_url = meta["latest_green_ci_on_main"]
    assert run_url.startswith(prefix) and run_url[len(prefix):].isdigit(), "Wrong CI URL"
    run = get_json(api + "/actions/runs/" + run_url[len(prefix):])
    assert run["conclusion"] == "success" and run["head_branch"] == "main", "Main CI is not green"
    assert run["head_sha"] == meta["deployed_commit"], "CI is for a different commit"
    jobs = get_json(api + "/actions/runs/" + str(run["id"]) + "/jobs?per_page=100")["jobs"]
    assert any(j["name"] == "M5 release gate" and j["conclusion"] == "success" for j in jobs), "Missing green release gate"
    assert get_json(api + "/branches/main")["protected"], "main is not protected"
    assert (ROOT / meta["branch_protection_screenshot"]).is_file(), "Actual branch-protection screenshot missing"
    authors, reviewers = set(), set()
    for number in set(meta["merged_m5_prs"]):
        assert isinstance(number, int) and number > 0, "Invalid PR number"
        pr = get_json(api + f"/pulls/{number}")
        assert pr["merged_at"] and pr["base"]["ref"] == "main", "PR is not merged into main"
        assert pr["merged_at"] >= "2026-11-03", "PR is outside Sprint 5"
        author = pr["user"]["login"].lower()
        reviews = get_json(api + f"/pulls/{number}/reviews?per_page=100")
        approved = {r["user"]["login"].lower() for r in reviews if r["state"] == "APPROVED" and r["user"]["login"].lower() != author}
        assert approved, "PR needs another member's approval"
        checks = get_json(api + f"/commits/{pr['head']['sha']}/check-runs?per_page=100")["check_runs"]
        assert checks and any(c["conclusion"] == "success" for c in checks), "PR has no successful check"
        assert not any(c["conclusion"] in ("failure","cancelled","timed_out") for c in checks), "PR has failed checks"
        authors.add(author)
        reviewers.update(approved)
    members = {m["github"].lower() for m in meta["members"]}
    assert members <= authors and members <= reviewers, "Each member needs a merged PR and review"


def export(meta, output, draft):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    candidates = [Path("C:/Windows/Fonts/arial.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")]
    font = next((p for p in candidates if p.is_file()), None)
    if font is None:
        raise ValueError("Install a Unicode Arial/DejaVu Sans font before exporting Vietnamese names")
    pdfmetrics.registerFont(TTFont("Submission", str(font)))
    style = ParagraphStyle("body", fontName="Submission", fontSize=11, leading=17, spaceAfter=11)
    rows = []
    running = meta.get("running_app") or "PENDING - public deployment not verified"
    rows.append(Paragraph("Running app: " + escape(running), style))
    if draft:
        warning = ParagraphStyle("warning",parent=style,textColor=colors.HexColor("#A12622"))
        rows.append(Paragraph("DRAFT - NOT READY FOR LMS SUBMISSION", warning))
    entries = [("Team",meta["team"]),
        ("Members", "; ".join(m["name"] + " (" + (m.get("student_id") or "ID pending") + ")" for m in meta["members"])),
        ("Scrum Master",meta["scrum_master"] + " (Sprint 5)"),
        ("Repository",meta["repository"]), ("Release v1.0",meta.get("release_v1_0") or "Pending actual release"),
        ("Latest green CI run on main",meta.get("latest_green_ci_on_main") or "Pending actual main run"),
        ("Test accounts","See the first screen of README.md")]
    for label, value in entries:
        rows.append(Paragraph(escape(label + ": " + value),style))
        if label == "Scrum Master":
            rows.append(Spacer(1,8*mm))
    output.parent.mkdir(parents=True,exist_ok=True)
    SimpleDocTemplate(str(output),pagesize=A4,rightMargin=20*mm,leftMargin=20*mm,topMargin=20*mm,bottomMargin=20*mm,
                      title="Team04 M5 submission",author="Team 04").build(rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata",type=Path,default=ROOT / "docs/m5-release.json")
    parser.add_argument("--draft",action="store_true")
    args = parser.parse_args()
    meta = json.loads(args.metadata.read_text(encoding="utf-8"))
    if not args.draft:
        try:
            verify(meta)
        except (ValueError, AssertionError, urllib.error.URLError, KeyError) as error:
            raise SystemExit("Final PDF blocked: " + str(error)) from None
    output = ROOT / "artifacts" / ("Team04_M5_DRAFT.pdf" if args.draft else "Team04_M5.pdf")
    export(meta, output, args.draft)
    print(str(output))


if __name__ == "__main__":
    main()
