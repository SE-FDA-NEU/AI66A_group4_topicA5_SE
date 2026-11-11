"""Offline regression tests for the release-evidence tools.

These tests deliberately use temporary files and mocked HTTP/GitHub responses.
They must not require Render, GitHub credentials, a public URL, or a database.
"""

import io
import json
import sys
from pathlib import Path

import pytest
from scripts import check_live, export_m5_submission, log_summary

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


class FakeResponse(io.BytesIO):
    def __init__(self, payload, *, status=200, headers=None):
        super().__init__(json.dumps(payload).encode("utf-8"))
        self.status = status
        self.headers = headers or {}

    def __enter__(self):
        return self

    def __exit__(self, *unused):
        self.close()


def test_check_live_accepts_healthy_response_and_matching_sha(monkeypatch, capsys):
    response = FakeResponse({"status": "ok"}, headers={"X-App-Commit": "abc123"})
    monkeypatch.setattr(check_live.urllib.request, "urlopen", lambda *args, **kwargs: response)
    monkeypatch.setattr(sys, "argv", ["check_live.py", "--url", "https://demo.example", "--expect-commit", "abc123"])

    check_live.main()

    result = json.loads(capsys.readouterr().out)
    assert result["health"] == "ok"
    assert result["commit"] == "abc123"


def test_check_live_rejects_commit_mismatch_without_leaking_response(monkeypatch, capsys):
    response = FakeResponse({"status": "ok"}, headers={"X-App-Commit": "wrong-sha"})
    monkeypatch.setattr(check_live.urllib.request, "urlopen", lambda *args, **kwargs: response)
    monkeypatch.setattr(sys, "argv", ["check_live.py", "--url", "https://demo.example", "--expect-commit", "abc123"])

    with pytest.raises(SystemExit, match="Health check failed"):
        check_live.main()

    assert "wrong-sha" not in capsys.readouterr().err


def test_log_summary_calculates_5xx_rate_and_p95(tmp_path, monkeypatch, capsys):
    log = tmp_path / "requests.log"
    records = [
        {"event": "http_request", "status": 200, "duration_ms": 10},
        {"event": "http_request", "status": 503, "duration_ms": 20},
        {"event": "http_request", "status": 200, "duration_ms": 30},
        {"event": "not_a_request", "status": 500, "duration_ms": 999},
    ]
    log.write_text("noise\n" + "\n".join(json.dumps(record) for record in records), encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["log_summary.py", str(log)])

    log_summary.main()

    result = json.loads(capsys.readouterr().out)
    assert result == {
        "requests": 3,
        "error_rate_percent": 33.33,
        "response_time_p95_ms": 30.0,
    }


def test_exporter_rejects_incomplete_metadata_before_network_access():
    metadata = {
        "members": [{"name": "Member One", "github": "one", "student_id": None}],
        "merged_m5_prs": [],
    }

    with pytest.raises(ValueError) as error:
        export_m5_submission.verify(metadata)

    message = str(error.value)
    assert "running_app is missing" in message
    assert "Student ID missing for Member One" in message
    assert "At least four actual merged M5 PR numbers are required" in message


def test_exporter_rejects_live_commit_mismatch(monkeypatch, tmp_path):
    metadata = complete_metadata(tmp_path)
    monkeypatch.setattr(export_m5_submission, "ROOT", tmp_path)
    monkeypatch.setattr(
        export_m5_submission.urllib.request,
        "urlopen",
        lambda *args, **kwargs: FakeResponse(
            {"status": "ok"}, headers={"X-App-Commit": "different-sha"}
        ),
    )

    with pytest.raises(AssertionError, match="Live commit mismatch"):
        export_m5_submission.verify(metadata)


def test_exporter_accepts_complete_mocked_release_evidence(monkeypatch, tmp_path):
    metadata = complete_metadata(tmp_path)
    monkeypatch.setattr(export_m5_submission, "ROOT", tmp_path)
    monkeypatch.setattr(
        export_m5_submission.urllib.request,
        "urlopen",
        lambda *args, **kwargs: FakeResponse(
            {"status": "ok"}, headers={"X-App-Commit": metadata["deployed_commit"]}
        ),
    )

    api = "https://api.github.com/repos/SE-FDA-NEU/AI66A_group4_topicA5_SE"
    members = metadata["members"]
    responses = {
        api + "/releases/tags/v1.0": {},
        api + "/git/ref/tags/v1.0": {
            "object": {"type": "commit", "sha": metadata["deployed_commit"]}
        },
        api + "/actions/runs/123": {
            "id": 123,
            "conclusion": "success",
            "head_branch": "main",
            "head_sha": metadata["deployed_commit"],
        },
        api + "/actions/runs/123/jobs?per_page=100": {
            "jobs": [{"name": "M5 release gate", "conclusion": "success"}]
        },
        api + "/branches/main": {"protected": True},
    }
    for index, member in enumerate(members, start=1):
        pr_url = api + f"/pulls/{index}"
        reviewer = members[index % len(members)]["github"]
        responses[pr_url] = {
            "merged_at": "2026-11-05T10:00:00Z",
            "base": {"ref": "main"},
            "user": {"login": member["github"]},
            "head": {"sha": f"pr-sha-{index}"},
        }
        responses[pr_url + "/reviews?per_page=100"] = [
            {"state": "APPROVED", "user": {"login": reviewer}}
        ]
        responses[api + f"/commits/pr-sha-{index}/check-runs?per_page=100"] = {
            "check_runs": [{"conclusion": "success"}]
        }

    monkeypatch.setattr(export_m5_submission, "get_json", responses.__getitem__)
    export_m5_submission.verify(metadata)


def complete_metadata(tmp_path):
    screenshot = tmp_path / "branch-protection.png"
    screenshot.write_bytes(b"synthetic screenshot")
    members = [
        {"name": f"Member {index}", "github": f"member-{index}", "student_id": f"ID-{index}"}
        for index in range(1, 5)
    ]
    return {
        "running_app": "https://demo.example",
        "team": "Team 04",
        "members": members,
        "scrum_master": "Member 1",
        "repository": "https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE",
        "release_v1_0": "https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/releases/tag/v1.0",
        "deployed_commit": "deployed-sha",
        "latest_green_ci_on_main": "https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/actions/runs/123",
        "branch_protection_screenshot": screenshot.name,
        "merged_m5_prs": [1, 2, 3, 4],
    }
