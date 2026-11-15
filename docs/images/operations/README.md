# Actual M5 evidence

This folder contains genuine screenshots and release/operations evidence.
Keep the capture date and test scope attached to each item. Never relabel a
local screenshot as production, or a current screenshot as an M3 "before".

## Public browser captures — 11 November 2026 (Vietnam)

The following 11 images were supplied for this update. The desktop captures
were taken in Chrome Incognito on the public Render HTTPS host (seven files; the
login capture also has DevTools open in a responsive layout); two further captures
were taken at a 390 × 884 Chrome DevTools responsive viewport; two were taken on a
physical phone.

| File | Evidence |
|---|---|
| `live-p0-login-incognito-responsive.jpg` | Public login page in an Incognito browser with DevTools open. |
| `live-p0-dashboard-incognito.jpg` | Authenticated Officer dashboard, desktop. |
| `live-p0-applications-list-incognito-8-records.jpg` | Officer application list showing eight records. |
| `live-p0-new-application-valid-incognito.jpg` | Populated valid application form. Citizen ID and bank-account values are redacted in this documentation copy. |
| `live-p0-score-details-incognito.jpg` | Scored application details: 95/100 and scoring factors. |
| `live-p0-validation-multiple-fields-incognito.jpg` | Multiple invalid-field messages, including monthly income 0. Not an isolated income-only BR2 test. |
| `live-p0-applications-list-incognito-10-records.jpg` | Officer application list showing ten records. |
| `live-mobile-dashboard-390x884-devtools.jpg` | Responsive dashboard at 390 × 884 CSS pixels. |
| `live-mobile-validation-390x884-devtools.jpg` | Responsive validation at 390 × 884 CSS pixels. |
| `physical-phone-dashboard.jpg` | Officer dashboard on a physical phone. |
| `physical-phone-validation.jpg` | Validation errors on a physical phone. |

The desktop screenshots show the public Render host in the browser address bar.
The physical-phone screenshots show the phone browser's address area. Capture
timestamps in the uploaded filenames correspond to 11 November 2026 Vietnam
time.

## Earlier public deployment and persistence evidence

These pre-existing captures are retained unchanged:

- `live-p0-data.jpg`: public saved-data page capture from 9 November 2026.
- `live-br-error.jpg`: public business-rule error page capture from 9 November 2026.
- `restart-persistence.jpg`: saved history entry after Render redeploy, captured
  on 9 November 2026.
- `live-after-redeploy.jpg`: the same saved application with identifiers masked,
  captured on 9 November 2026.
- `mobile-p0.jpg`: earlier 390 × 844 browser viewport capture, not a physical
  phone test.

The 11 November captures above do not replace the 9 November redeploy evidence.
The earlier JPEGs are page captures and do not show desktop browser chrome. Their 9 November URL, commit SHA and Render deploy IDs are recorded in [deployment.md](../../deployment.md). Branch-protection and rollback evidence remain pending.

## Existing UI evidence

The broader UI and local-regression screenshots remain in `docs/images/ui/`.
They are intentionally not copied into this operations folder or this update
package because they are not new production captures.

## Remaining evidence / acceptance work

| Evidence or check | Current status |
|---|---|
| Public login page | Captured; successful login is indirectly represented by the authenticated Officer pages, but the click/result itself is not separately captured. |
| Dashboard and application list | Captured on public URL. |
| Valid application and scored details | Captured on public URL. |
| Clear business-rule/field errors | Captured with several invalid fields, including income 0. Isolated income-only BR2 and HTTP 422 still need explicit verification. |
| No-save on invalid submission | Not proven by the supplied screenshots; verify list count or persisted rows before marking Pass. |
| Responsive browser viewport | Captured at 390 × 884 CSS pixels. |
| Physical phone | Dashboard and validation captured. Other flows on the phone are not evidenced here. |
| Reload persistence | Earlier deployment record describes a reload/redeploy check on 9 November; the new 11 November screenshots do not show a before/after reload pair. |
| Persistence after Render redeploy | Earlier evidence retained; do not change its original date or scope. |
| Scoring history live capture | Not supplied in this image set. Existing `docs/images/ui/p1-history-two-attempts.png` is local UI/regression evidence, not a new live capture. |
| Two post-M3 UI improvements | M3 Before and feedback images were not supplied and are excluded from this package. Do not claim the comparison complete. |
| Branch protection / rollback | Still requires actual GitHub settings and rollback evidence. |

For each newly performed manual test, record the actual tester, local date/time,
URL, deployed commit SHA, observed result and evidence filename in the relevant
test/release record. Do not fill a Pass result based on a screenshot alone when
the assertion requires an API response or persistence check.

See [deployment](../../deployment.md), [UI](../../ui.md),
[operations](../../operations.md).
