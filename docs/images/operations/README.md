# Actual M5 evidence

Save genuine captures here after the actions occur:

- `branch-protection.png`: main requires PR, another approval and M5 release gate.
- `before-*.png`: genuine previous M3 interface captures; do not relabel new images.
- `after-*.png`: deployed improvements with visible browser address bar.
- `live-p0-data.jpg`, `live-br-error.jpg`: real deployed data and rule refusal.
- `mobile-p0.jpg`: 390×844 browser viewport on the HTTPS URL; not a physical-phone test.

No screenshot has been fabricated to claim an external setting or deployment.

Captured on 9 November 2026 (Vietnam) against
https://credit-score-team04-03or.onrender.com:

- `restart-persistence.jpg`: the saved history entry after Render redeploy.
- `live-after-redeploy.jpg`: the same saved application with identifiers masked.

The JPEGs are genuine page captures without browser address-bar chrome; the
verified URL, SHA and deploy IDs are recorded in [deployment.md](../../deployment.md).
Branch-protection and rollback evidence remain pending. PR [#265](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/265), merged 11 November, adds Incognito public captures and physical-phone dashboard/validation captures. They provide partial evidence, not a complete P0 acceptance run.

## Remaining M5 evidence

| Evidence | Status / next capture |
|---|---|
| Public data/error/history/redeploy | Existing JPEGs above; preserve their original capture date and scope |
| Address-bar-visible public P0/error | Captures were added in PR #265 on 11 November; this checkout predates that merge |
| Private-window and physical phone | Incognito screenshots and two physical-phone screens were added in PR #265; full P0 flow on both devices is not evidenced |
| Main branch protection | Pending actual PR/approval/M5 gate settings screenshot |
| Render deploy-after-CI | Record actual service main branch and checksPass setting |
| Rollback | Pending previous/new SHA, date/tester and retained-data result |
| Two post-M3 improvements | Genuine before photos, actual feedback and live after captures needed |

Keep credentials and environment panels out of captures. Record URL, app SHA,
tester/date and observed result; do not relabel local/current images as M3 before.
Current runbook and release metadata: [operations](../../operations.md), [m5-release](../../m5-release.json).
