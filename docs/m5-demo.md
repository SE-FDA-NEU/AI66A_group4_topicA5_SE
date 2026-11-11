# M5 final demo — 12 minutes + 5 minutes of questions

Public URL: [https://credit-score-team04-03or.onrender.com](https://credit-score-team04-03or.onrender.com). Use that HTTPS app for the final demo; local rehearsal does not replace it. Use synthetic data and the README demo accounts.

| Time | Presenter | Show |
|---|---|---|
| 0:00–1:00 | Trung | Officer/Manager persona, problem/value and P0 US01/03/04/08/09 |
| 1:00–6:00 | Hải | Private window → first page → Officer login → Dashboard → New application → saved Details → score/reasons/history → list → reload. Submit income 0 to show server refusal/no-save. Manager opens the same saved record by clicking and reviews/approves when eligible. |
| During the five-minute flow | Hải | Two post-M3 improvements with genuine before/after captures: saved record visible before slow scoring; accessible Scoring history with persisted attempts |
| 6:00–8:00 | Thành | Latest main CI test output; instructor-selected P0 normal/error/both-boundary cases in testing.md; deliberate local rule break → red test → restore |
| 8:00–10:00 | Huy | [Green main run](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/actions/runs/42505446604), actual protection screenshot, merge-to-deploy path, /health and rollback; defend one design decision |
| 10:00–12:00 | Trung | One lesson and one known risk/plan from operations.md; show release SHA, actual v1.0 and submission evidence when ready |
| Next 5 minutes | All | Explain your own PR/test/screen/rule; answer instructor and another team's questions |

## Rehearsal inputs and checks

As Hoang, create income `20000000`, loan `100000000`, term `24`, payment `5000000`,
history `3 years, on time`, CIC `1`. Verify pending/High risk state if applicable,
then a stored score/reasons; reopen from the list and reload. Use Details' score
action on the same record if a request fails; do not create duplicates.

For a predictable refusal, use income `0` with other fields valid. Explain what
happened, why and what to do next. Use another valid but high-DSR application to
show the High risk warning; scoring and Manager approval remain separate actions.

On the laptop only, show a genuinely failing boundary test:

```bash
python -m pytest backend/tests/test_scoring_unit.py::test_br6_label_boundaries -v
```

Temporarily change `score < 40` to `score <= 40` in `label_for` within
`backend/app/scoring_service.py`, rerun that command and explain the failed
40-point boundary. Restore the original operator in the editor and rerun green.
Do not commit/deploy the deliberate fault or reset unrelated work.

## Design decision to defend

One Render origin serves FastAPI plus built React; hosted PostgreSQL retains data.
Relative `/api` calls avoid a separate frontend/backend origin setup. Alternatives:
separate frontend hosting, or a persistent SQLite disk. Reconsider if independent
frontend scaling or real lending requirements appear. `rules-v1` is a deterministic
educational score; no AI training, calibrated probability or disbursement is claimed.

## Before/after and live evidence

| Improvement / check | Available reference | Status / remaining work |
|---|---|---|
| Saved record before slow scoring | [Local saved-before-scoring regression capture](images/ui/p0-saved-before-scoring.png) | M3 Before and genuine feedback evidence were not supplied and are intentionally excluded from this update. The local capture is not relabelled as a live After image. |
| Scoring history tab | [Local two-attempt history regression capture](images/ui/p1-history-two-attempts.png) | M3 Before and genuine feedback evidence were not supplied and are intentionally excluded from this update. The local capture is not relabelled as a live After image. A live production history capture is still absent. |
| Public P0, data/error/mobile/reload | [New public browser evidence inventory](images/operations/README.md) | 11 November captures now cover login page, authenticated dashboard, application list, valid form, score details, validation errors, responsive 390 × 884 viewport and physical-phone dashboard/validation. Isolated income=0/no-save, explicit reload proof and role-specific full click-through still require recorded manual verification. Earlier 9 November redeploy evidence remains separately dated. |
| Deployment/release | [Deployment record](deployment.md) | Live/main-CI SHA alignment, branch-protection screenshot, rollback rehearsal and v1.0 still require completion. |

Do not infer instructor feedback or relabel a current screenshot as "before".
Existing local examples do not prove public acceptance. Save genuine deployment
captures under [images/operations](images/operations/README.md).

## Final check before presenting

- Recheck the README URL and `running_app` in [release metadata](m5-release.json); preserve actual live SHA until verified changed.
- Verify private/mobile P0, saved data after reload/restart, and error guidance.
- Refresh the latest green-main run and confirm its SHA equals the live commit.
- Confirm protection, other-member reviews, per-member PR/review/closed issue,
  and tag v1.0 on the actual deployed commit.
- Fill member IDs and real evidence; export final PDF only after the release
  verification tools are available. A missing script or pending metadata is not a final PDF.
- Keep app/DB online through 2026-11-30 and until grades are published.

Recorded live SHA on 2026-11-09: `fb2c3dc`; latest main CI: `cd273ab`.
This mismatch must be resolved and verified before the final release demo.
Public Incognito captures and physical-phone dashboard/validation captures dated
11 November are now listed in [the operations evidence index](images/operations/README.md).
They do not prove every P0 assertion by themselves. Isolated income-zero/no-save,
explicit reload and complete role-based click-through still need recorded results.
M3 Before/feedback comparisons are intentionally excluded because those source
images were not supplied. See [the dated deployment record](deployment.md#public-deployment-verification--9-november-2026-vietnam).
