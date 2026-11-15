# UI - Credit Scoring Demo

## 1. P0 stories and status

| Story | Screen(s) | Route | Status | Issue |
| --- | --- | --- | --- | --- |
| US01 Log in with my account | Login | `/` | partly works (implemented; independent browser acceptance pending; log out is a button in the top bar; the 15-minute lock is shown as a message) | #9 |
| US03 Input a loan application | New application | `/loan-applications/new` | partly works (implemented; independent browser acceptance pending; saves, flags High risk when DSR > 50%, scores right away) | #10 |
| US04 View the credit score with explanations | Application details | `/loan-applications/:id` | partly works (implemented; independent browser acceptance pending; score 0-100, label, factors, CIC group; deterministic scorer `rules-v1`; no offline training in M5 scope) | #11 |
| US08 Overview dashboard | Dashboard | `/dashboard` | partly works (implemented; independent browser acceptance pending; today's total, average score, high-risk count; shows "0 applications today" when empty) | #13 |
| US09 Alert on missing or malformed data | New application | `/loan-applications/new` | partly works (field errors and no-save behavior implemented; API required-income wording fixed; independent browser acceptance pending) | #14 |
| US10 Edit/cancel unprocessed application | Edit application and Application details | `/loan-applications/:id/edit`, `/loan-applications/:id` | works (owner/Admin edit and confirmed cancel; processed-state and access guards tested) | #22 |

**Public acceptance evidence update (11 November 2026):** [PR #265](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/265) added Incognito captures of public screens and physical-phone captures of the Dashboard and validation. These are useful visual evidence, but do not establish the isolated HTTP 422/no-save checks or a complete P0 flow on a phone. The independent acceptance checklist remains open; see [deployment evidence](deployment.md#additional-public-browser-captures--11-november-2026-vietnam).

Also built, not P0: `/loan-applications` (list, P1, US05 partly) so a person can reach any application without typing a URL. US10 management controls are available from Details only while the application is pending and has no scoring result.

**Screen flow (updated from M1):** people reach application records from the navigation, list or Manager review queue without typing a details URL.

```mermaid
flowchart TD
    Login["Login<br/>/"] -->|"Sign in successfully"| Dashboard["Dashboard<br/>/dashboard"]
    Login -->|"Invalid credentials or account locked: show message"| Login

    Dashboard -->|"Both roles: New application"| New["New application<br/>/loan-applications/new"]
    Dashboard -->|"My applications / Branch applications"| List["Application list<br/>/loan-applications"]
    Dashboard -->|"Manager: review queue across all dates"| Queue["Manager review filter on the application list<br/>/loan-applications?view=review"]
    Dashboard -->|"Manager: Employees"| Users["Employee accounts<br/>/admin/users"]

    New -->|"Invalid input: keep form and show field errors"| New
    New -->|"Save, then score"| Details["Application details<br/>/loan-applications/:id"]
    New -.->|"Saved but scoring failed: open with a notice"| Details
    List -->|"Open / Review"| Details
    List -->|"New application"| New
    Queue -->|"Filter review, risk, eligibility and employee"| Queue
    Queue -->|"Review"| Details

    Details -->|"Back to the list"| List
    Details -->|"Manager: back to review queue"| Queue
    Details -->|"Score again unless approved or cancelled"| Details
    Details -->|"Pending with no score: Edit"| Edit["Edit application<br/>/loan-applications/:id/edit"]
    Details -->|"Pending with no score: confirm Cancel"| Cancelled["Cancelled state retained; removed from active review"]
    Details -->|"Authorized View full numbers / Hide numbers"| Details
    Details -->|"Manager: eligible result, review and confirm"| Approved["Approved state on the same Details screen<br/>Saved Manager name and approval time"]
    Approved -->|"Back to the list"| List
    Approved -->|"Manager: return to queue; approved record is excluded"| Queue

    Users -->|"Create Officer, rename, confirm deactivate or reactivate"| Users
    Dashboard -->|"Log out / API returns 401"| Login
```

Both roles can create applications and use the top bar to return to the dashboard or list. The review queue is a Manager filter of the application list; Approved is a persisted state of Application details. Scoring is a recommendation, followed by a separate Manager decision. The backend enforces ownership and Manager-only actions. Log out from any protected page, or an API response of 401 for an expired/invalid session, returns the user to Login. Full identifiers hide after 30 seconds, window blur or tab hiding.

## 2. Wireframes

Each wireframe says why the person comes here and which API endpoints the screen calls.

### 2.1 Login `/`

"The user comes here to sign in with their branch account."
Calls: `POST /api/auth/login`

![Wireframe 1](images/ui/wireframe-1.svg)

**Login field validation:** empty or whitespace-only credentials show
`Email is required.` / `Password is required.`. Email is limited to 254 Unicode
characters and password to 128, matching the existing API limits; exceeding
either shows `Email must not exceed 254 characters.` /
`Password must not exceed 128 characters.`. A malformed email shows
`Invalid email address.`. Invalid form input does not send a login request and
focus moves to the first invalid field. API field errors are displayed next to
their inputs and focused too. Validation does not trim or change the submitted
password. The page uses a fixed light theme, and the password field has a standard
show/hide toggle.

The helper's four automated cases run with `npm test` from `frontend/`; these
Node tests check required fields, exact limits, unchanged credentials and email
format. Local check on 2026-10-30: all 52 frontend tests and the production
build passed. Eight additional Edge headless interaction checks against the
built interface passed: blank/whitespace input, invalid email, limits on both
sides, request blocking, field focus, mapped API errors, unchanged password,
lock-message display and the show/hide password toggle. These checks mocked the login API;
they do not verify real-account authentication, full P0 browser acceptance
or GitHub CI/review.


### 2.2 Dashboard `/dashboard` (by role, all four states)

"The Officer comes here to see their own activity and create/track applications. The Manager comes here to review branch activity and the backlog, and manage employee access."
Calls: `GET /api/dashboard/summary`; Manager also calls `GET /api/loan-applications` for the review queue. All counters use database data. The daily summary is Vietnam-local today; backlog counts cover all dates.


![Dashboard wireframe](images/ui/wireframe-3.svg)

Zero applications today does not clear the Manager backlog. Approved, rejected and cancelled records are excluded from the queue. Eligible means a decision can be made, not automatically approved. Branch applications has risk/eligibility/employee filters; My applications displays the Officer's records without branch controls. Both roles retain navigation to New application because the existing API permits authenticated users to create records.

### 2.3 New application `/loan-applications/new`

"The user comes here to enter a customer's loan application and get a credit score."
Calls: `POST /api/loan-applications`, then `POST /api/loan-applications/{id}/score`

![New application wireframe](images/ui/wireframe-2.svg)

The wireframe preserves the required-field design. An empty, blank,
missing or null income return "Income is required" from the API; malformed numeric
input returns "Monthly income must be a whole number." The API saves nothing on
validation failure. A production Incognito capture is now available at
[the multiple-field validation screenshot](images/operations/live-p0-validation-multiple-fields-incognito.jpg).
It shows clear field-level errors, including monthly income equal to zero, but
also contains other invalid fields. It therefore does **not** isolate BR2 with
all other fields valid. Confirm the isolated income-zero case and no-save
behavior through the live browser/network and application list before marking
US09 independently accepted.


### 2.4 Application details `/loan-applications/:id`

"The user comes here to read the score, the reasons behind it, and the data the officer entered."
Calls: `GET /api/loan-applications/{id}`, `POST /api/loan-applications/{id}/score`, `PATCH /api/loan-applications/{id}/approve` (Manager), `PATCH /api/loan-applications/{id}/cancel` (owner/Admin confirmation), `POST /api/loan-applications/{id}/sensitive-data/reveal` (explicit lookup)

![Wireframe 4](images/ui/wireframe-4.svg)


Manager decision wireframe (Application details, same screen purpose and APIs)

When the application is `pending` and has no `latest_score`, Details shows
**Edit application** and **Cancel application**. Edit opens
`/loan-applications/:id/edit`; the form omits protected identifiers. Cancel first
shows a confirmation and retains the record after success. Processed applications
show a read-only state and cannot be edited or cancelled.

The Scoring history tab has loading, empty, data and failure states; failure is
not rendered as an empty history.

### 2.4.1 Edit an unprocessed application `/loan-applications/:id/edit`

Calls: `GET /api/loan-applications/{id}`, `PATCH /api/loan-applications/{id}`.
The page loads the saved values, validates the same numeric/text/BR9 rules as
the create form, focuses the first invalid field, and returns to Details after a
successful save. `citizen_id` and `bank_account` are intentionally not sent by
the ordinary edit form, so omitted encrypted identifiers remain unchanged.

### 2.5 Protected identifiers (on application details)

"The user comes here to check the customer identifiers for an application they are permitted to open."
Calls: `POST /api/loan-applications/{id}/sensitive-data/reveal`.

![Protected identifiers wireframe](images/ui/wireframe-5.svg)

### 2.6 Employee accounts `/admin/users` (Manager only)

"The user comes here to create Officer accounts and control employee access while retaining loan history."
Calls: GET/POST `/api/admin/users`, PATCH `/api/admin/users/{id}`.

![Employee accounts wireframe](images/ui/wireframe-6.svg)

### 2.8 Manager notifications `/notifications`

"The user comes here to find new applications requiring review and remember which notifications were read."
Calls: GET `/api/notifications`, PATCH `/api/notifications/{id}/read`.
Loading: loading message. Empty: No applications awaiting review. Error: readable
message with retry for network/server failures. Data: application/Officer/time/status,
Unread or Read badge, Open application and Mark as read. Counter refresh: 30 seconds
while visible plus entry/focus. Cancelled/approved/rejected records leave this list.

## 3. Error messages

These are the exact strings currently used by the backend or the frontend.
For validation, the API returns `detail` plus per-field `errors`. With multiple
field errors the form shows "Please fix these fields:" and the field messages;
with one field error it shows the API detail "Please correct the highlighted
fields and submit again." and the message beside the field.

| API code | Rule | The user sees |
| --- | --- | --- |
| `401` | US01 | "Email or password is incorrect. Check your details and try again." |
| `423` | US01 (request while locked after 3 wrong passwords) | "Too many wrong passwords. Your account is locked for 15 minutes. Try again later or ask your manager to help." |
| `422` | BR2 (income equals 0) | "Monthly income must be greater than 0 VND." |
| `422` | US09 (nonnumeric or malformed income text) | "Monthly income must be a whole number." |
| `422` | US09 (missing, empty, whitespace-only or null income) | "Income is required" |
| `422` | BR9 (payment exceeds loan amount) | "Estimated monthly payment must not exceed the loan amount." |
| `422` | BR9 (payment x term does not cover loan amount) | "Estimated monthly payment multiplied by the loan term must cover the loan amount." |
| `422` | BR7 (invalid Citizen ID format) | "Citizen ID must be 9 or 12 digits, with no spaces, letters or separators." |
| `422` | BR7 (invalid bank account format) | "Bank account must be 6 to 20 digits, with no spaces, letters or separators." |
| `429` | BR5 (fourth scoring request in the rolling hour) | "This application has already been scored 3 times in the last hour. It is now marked 'Requires manager review'. Ask a manager to review it." |
| `403` | BR8 (own applications only) | "You can only open applications you created. Ask your manager if you need access to this one." |
| `404` | US05 (application does not exist) | "Application not found. Check the link or return to the list." |
| `409` | Scoring an approved or cancelled application | "This application is cancelled or already approved, so it cannot be scored again. Go back to the list or ask your manager for help." |
| `403` | Approval is Manager-only | "Only a manager can approve a loan application. Ask your manager to review this application." |
| `409` | Approval state is cancelled, rejected or approved | "This application is cancelled, rejected or already approved. Select an application awaiting approval." |
| `409` | Latest result is not eligible for approval | "This application needs a valid eligible score before approval. Review its data and scoring results first." |
| `409` | Application changes during approval | "This application changed while you were reviewing it. Reload the details before deciding." |
| `403` | US10 edit/cancel by another Officer | "You can only open applications you created. Ask your manager if you need access to this one." |
| `409` | US10 edit after processing | "Application already processed, cannot be edited" |
| `409` | US10 cancel after processing | "Application already processed, cannot be cancelled." |
| `422` | US10 invalid/empty edit | "Some of the information isn't valid. Check the highlighted fields and try again." |
| `401` (missing token) | US01 | "Please sign in to continue." |
| `401` (expired/invalid/revoked token) | US01 | "Your session has expired. Please sign in again." (shown on the login screen) |
| `503` | BR7 encryption key unavailable or invalid | "Identifier protection is not configured. Ask the administrator to run python -m app.init_secrets and restart the server." |
| `503` | BR7 saved data cannot be decrypted | "The saved identifier cannot be opened with the configured key. Ask the administrator to restore the original encryption key." |
| `503` | BR7 audit unavailable | "Access could not be recorded, so protected numbers were not opened. Try again or ask your administrator for help." |
| `403` | BR8 account management | "Only a manager can manage employee accounts. Ask your branch manager for help." |
| `403` | BR8 inactive account at login | "This employee account is inactive. Ask your manager to reactivate it." |
| `409` | BR8 duplicate account | "An account already uses this email. Use another email or update the existing employee." |
| no response | Network unavailable | "We can't reach the server. Check your connection and try again." |
| no response within 15 seconds | Request timeout | "The server took too long to respond. Check the applications list before retrying, then try again." |
| `201` (not an error) | BR4 (CIC group 4 example) | Score shows "-", label "Recommendation Rejected", reason: "CIC debt group 4 (bad debt). Groups 3-5 are rejected automatically." |
| `201` (not an error) | BR1 (score out of range) | "The model returned an invalid score, so no score is shown. A manager will review this application." |

**API validation:** an empty income string now follows the required-field
branch and returns exactly "Income is required". Whitespace-only, null and omitted
income use the same message. Regression tests cover these inputs, BR9 and no-save
behavior. Automated API results do not establish independent browser acceptance.

## 4. What changed since M2

### Design change: a recommendation needs a separate Manager decision

Building Application details exposed the need to distinguish a model recommendation
from a Manager's recorded decision. An eligible score does not change the loan
to approved. The interface now offers Admin-only review and confirmation, backed
by `PATCH /api/loan-applications/{id}/approve`. The backend commits the approved
status and `loan.approved` audit together; detail responses expose
`approval.actor_id`, `approval.actor_name` and `approval.approved_at` so the user
can see who made the decision and when, including after reload. The High risk flag
is preserved.

### Design change: role-focused workspaces

The shared Dashboard did not make clear what an Officer or a Manager should do next. Officer now sees My activity, My applications and a primary New application action. Manager sees a Branch overview, a database-backed review queue across all dates, review/high-risk/eligible filters, a Created by employee filter and a Manage employees shortcut. The details page names the current role and highlights the Manager's approval decision. No API rule changed: BR8 (Officer sees own records, Manager sees all) is still enforced by the backend, and the interface does not create any permission.

| | Officer | Manager |
| --- | --- | --- |
| Navigation | My dashboard, My applications, New application | Branch overview, Branch applications, New application, Employees |
| Data scope | Own applications only (daily metrics and list) | Branch daily metrics; review queue across all dates; all employees' applications |
| Details | Can score; sees who makes the approval decision | Can approve an eligible score after confirmation |
| Not available | Approval, branch filters, Employees | Changing Manager accounts |

US07 adds Manager-only Notifications, a 30-second counter and persisted read state. US06 history UI and US10 edit/cancel are implemented. The review queue is not a notification feature.

**Evidence status:** five running-app screenshots are included below.

### Design system (PR 1)

PR 1 of the UI unification replaces the three visual styles (dark glass login, gradient workspace, plain pages) with one system.

- **Tokens** (`frontend/src/styles.css`): one light theme, no gradients or glass; brand `#176b78`; radii 6 / 10 / 14 px; 4 px spacing scale; system font stack.
- **Wording** (`frontend/src/glossary.js`): single source for status labels (`statusText`, `RISK_TEXT`); score labels are defined here and wired in PR 2.
- **Components** (`frontend/src/components/`): `PageHeader`, `Field`, `Card`, `DataList`.
- **Top bar:** compact 56 px bar; navigation collapses into a "Menu" toggle at 1280 px and below (the Manager bar needs about 1170 px for one row on Windows fonts and Linux fonts run wider, so this is higher than the 600 px first planned); the user name is truncated with an ellipsis at 14ch (full name in the tooltip). Footer reads "Credit Scoring" only.
- **Login:** rebuilt on the shared system, no intro panel, placeholder `name@branch.vn`.

Before / after. Before: pre-redesign build d74ed7e (= origin/main); after: branch head. Both captured 2026-11-15 on the seeded test server (`backend/tests/browser_server.py`).

| View | Before | After |
| --- | --- | --- |
| Login 1440 | ![](images/ui/redesign/pr1-before-login-1440.png) | ![](images/ui/redesign/pr1-after-login-1440.png) |
| Login 390 | not captured (no before image) | ![](images/ui/redesign/pr1-after-login-390.png) |
| Officer dashboard 1440 | ![](images/ui/redesign/pr1-before-officer-dashboard-1440.png) | ![](images/ui/redesign/pr1-after-officer-dashboard-1440.png) |
| Manager top bar 390 (before: old bar, no menu; after: Menu open) | ![](images/ui/redesign/pr1-before-manager-topbar-390.png) | ![](images/ui/redesign/pr1-after-manager-topbar-390.png) |

Findings re-check against the after images:

- **V1** (login vs workspace visual mismatch): fixed for login and top bar; both use the same tokens. Other pages still carry old layouts until PR 2-4.
- **C1** (generic copy), login part: fixed ("WELCOME BACK" and intro removed, placeholder `name@branch.vn`). Form and remaining page copy is left to PR 4.
- **L6** (mobile top bar about 180 px tall), top bar part: partly fixed. The closed bar is 56 px; with Menu open it lists all links and the user row. List and dashboard layout on mobile is left to PR 3.

### Application detail (PR 2)

PR 2 rebuilds `/loan-applications/:id` on the PR 1 components.

- **Layout:** two columns at 900 px and above. Left: tabs "Application details" (data list and protected identifiers) and "Scoring history". Right (sticky): Credit score card and decision card. Below 900 px it is one column with the score and decision first.
- **Removed:** the eyebrow, the subtitle, the "Manage application" card, the duplicate back link and the extra High risk badge. The High risk banner is shown once (the missing space after "High risk." is fixed). Edit and Cancel moved to the page header with the same rule as before: pending and unscored only.
- **Score factors:** the "+20:" prefixes are replaced by an up or down arrow with screen-reader text; factors worth 0 points are hidden. Each result has one label from the glossary; the history tab also shows "Recommendation Rejected".
- **Ruling, model version:** shown on the Credit score card to Managers only; the history tab keeps the model column for everyone who can open it.
- **Decision copy:** "Waiting for the branch manager's decision." and "Approval needs a latest score of 70 or more (Eligible for proposal)."
- **Out of scope:** D6 (Manager Reject action).

Before: pre-redesign build, captured 2026-11-15 on the seeded test server. After: branch head, same server, 1440 px wide (390 px for the mobile view); application ids differ between seeded runs.

| View | Before | After |
| --- | --- | --- |
| Officer, scored (75) 1440 | ![](images/ui/redesign/pr2-before-officer-detail-1440.png) | ![](images/ui/redesign/pr2-after-officer-detail-1440.png) |
| Officer, rejected (10) 1440 | ![](images/ui/redesign/pr2-before-officer-rejected-1440.png) | ![](images/ui/redesign/pr2-after-officer-rejected-1440.png) |
| Manager, eligible (95) 1440 | ![](images/ui/redesign/pr2-before-manager-detail-1440.png) | ![](images/ui/redesign/pr2-after-manager-detail-1440.png) |
| Manager 390 | not captured (no before image) | ![](images/ui/redesign/pr2-after-manager-detail-390.png) |

Findings re-check against the after images:

- **D1:** fixed.
- **D2** (inconsistent score labels): fixed on the detail page and the history tab; the list pages are left to PR 3.
- **D3** (score factors): fixed except that the base score is still not shown, so the listed points do not sum to the score.
- **D4:** fixed.
- **D5:** fixed.

### Dashboards and list (PR 3)

PR 3 rebuilds `/dashboard` (both roles) and `/loan-applications` on the PR 1 components.

- **Officer dashboard:** "My applications overview" with a "New application" action, tiles, a "Needs my action" card and a "Recent applications" card. "Needs my action" lists pending and manual-review applications, oldest first, at most 8; pending rows link "Get credit score" (scoring starts on arrival). "Recent applications" shows the 5 newest not already shown above. Opening an item from the dashboard adds a "Back to the dashboard" link on the detail page.
- **Manager dashboard:** the review queue comes first ("Manager review queue", "Open review queue"), the Needs review / High risk / Eligible chips link to the matching list view, and the branch activity tiles come last.
- **List:** a chip filter row (counts from the glossary texts) plus a "Created by" select (Manager), an Application column (id and created date), one status chip per row (plus High risk), income, loan and term, and a Score column that reads "Not scored" when there is no score. Whole rows open the application. On phones (600 px and below) each row becomes a card with labelled lines.
- **Detail follow-ups:** the back link returns to the page the user came from (the dashboard, or the list with its `?view=` filter), the Officer decision card says "The branch manager can decide once the application is scored." before a score exists, the score card stacks its number above the factors in the narrow side column, and the side column is sticky only on screens at least 901 px wide and 820 px tall (no nested scroll on short screens).
- **Rulings:** "Recent applications" excludes items already shown under "Needs my action"; sorting is offered only in the "All" view (review views keep the queue order); the sticky side column is limited to tall screens.
- **Removed:** the old `.filter-tabs` styles (unused after the chip filters).

Before: pre-PR 3 build, captured 2026-11-15 on the seeded test server. After: branch head, same server, 1440 px wide (390 px for the mobile views); application ids and dates differ between seeded runs. Before images were reused from the earlier capture set; no before image exists for the Officer list or the Officer dashboard at 390 px.

| View | Before | After |
| --- | --- | --- |
| Officer dashboard 1440 | ![](images/ui/redesign/pr3-before-officer-dashboard-1440.png) | ![](images/ui/redesign/pr3-after-officer-dashboard-1440.png) |
| Manager dashboard 1440 | ![](images/ui/redesign/pr3-before-manager-dashboard-1440.png) | ![](images/ui/redesign/pr3-after-manager-dashboard-1440.png) |
| Manager list 1440 | ![](images/ui/redesign/pr3-before-manager-list-1440.png) | ![](images/ui/redesign/pr3-after-manager-list-1440.png) |
| List 390 (before: Manager list; after: Officer list) | ![](images/ui/redesign/pr3-before-manager-list-390.png) | ![](images/ui/redesign/pr3-after-officer-list-390.png) |
| Officer dashboard 390 | not captured (no before image) | ![](images/ui/redesign/pr3-after-officer-dashboard-390.png) |

Findings re-check against the after images:

- **L1:** fixed. The filter is renamed "High risk, awaiting review", so a High risk row is no longer shown next to a "(0)" filter.
- **L2:** fixed. Unscored rows read "Not scored" in the list Score column and "Waiting for a score" on the Manager dashboard, instead of "Scoring in progress" with "-".
- **L3:** fixed. The Application column shows id and created date, the date sort is offered in the "All" view, and the whole row is clickable (the link is kept for keyboard use).
- **L4:** fixed. The today tiles are compact and below the work lists; the Officer home now has "Needs my action".
- **L5:** fixed by re-labelling only. Queue rows the Manager cannot act on yet are still listed but labelled "Waiting for a score"; they are not filtered out.
- **L6** (mobile layout): fixed for the list and dashboards; at 390 px the list is a card per application and there is no horizontal page scroll (covered by E2E at 375 px).
- **C1** (generic copy): dashboards and list now use task wording ("Needs my action", "Manager review queue") with no eyebrow or explanatory subtitle. The New application form copy is left to PR 4.

### Running-app screenshots

![Login screen](images/ui/login-screen.png)

![Officer application data, score and explanations](images/ui/officer-saved-application.png)

![Monthly income validation error](images/ui/income-validation-error.png)

This existing Sprint 3 capture is historical evidence; it is not a new capture proving the current validation message.

![Manager filters by eligibility and employee](images/ui/manager-application-filters.png)

![Approved application with Manager name and time](images/ui/manager-approved-application.png)

### P0 completion in this copy (2026-10-29)

All five P0 stories have their implementation and local browser verification.
`NewApplication.jsx` opens the saved record before requesting the score from
`ApplicationDetail.jsx`. This exposes the stored `pending` status (Scoring in
progress) and BR3 warning while scoring is slow. The request is consumed once,
including under React StrictMode and after reload. A scoring error leaves the
record accessible with Get credit score; retry does not create a second loan.
Login mirrors the API's nonblank/254/128 limits, names invalid fields and preserves
the entered password. The current scoring engine is the deterministic `rules-v1`.

The seven tests in `frontend/browser/p0.spec.js` ran in real headless Microsoft Edge
against this copy's FastAPI and a newly seeded temporary SQLite database. Form
submissions, reads, scoring and Dashboard totals use persisted data. One scoring
request is deliberately held to inspect pre-score state, and one is deliberately
answered with 503 to exercise recovery; those controlled errors are not claims
about a live service outage. No existing database, key or account was changed.

| Check | Observed local result |
| --- | --- |
| US01 correct credentials to Dashboard | 953 ms (requirement < 2000 ms); three wrong passwords and locked response also checked |
| US03 Submit to persisted details | 93 ms (requirement < 3000 ms), with scoring deliberately held |
| US04 low score and normal result | Rejected result has at least two reasons; normal result 95 with CIC group 1; list navigation and reload retain it |
| US08 daily data | Empty state, then 10 real GUI-created applications and average score 95; Manager workspace also opens |
| US09 invalid input | Exact required/text/zero-income messages, no create request and unchanged stored row count; keyboard focus and 375 px viewport checked |

These are local automated checks on one machine, not independent human sign-off,
fresh-clone evidence, GitHub CI status or a performance guarantee for other machines.
The viewport captures below do not contain browser chrome/address bars; the
address-bar desktop captures are recorded in section 5 and in
[docs/images/operations](images/operations/README.md).

![Saved High risk record while scoring is in progress](images/ui/p0-saved-before-scoring.png)

![Persisted normal score and CIC explanations](images/ui/p0-saved-score-and-reasons.png)

![Rejected recommendation and its reasons](images/ui/p0-rejected-score.png)

![Ten database-backed applications and average score](images/ui/p0-dashboard-ten-records.png)

![Income validation on a 375 px viewport](images/ui/p0-mobile-validation.png)

The files `p0-officer-dashboard.png`, `p0-income-validation.png` and
`p0-manager-dashboard.png` in `docs/images/ui/` are further local Playwright
outputs generated by `frontend/browser/p0.spec.js` (via its `capture` helper, like
the images above) against the isolated test server; they are not public-site captures.


### Logout session and cache protection

Log out in the top bar calls `POST /api/auth/logout`, clears local session data
and returns to Login immediately. Back must not restore private pages; another
independent session stays signed in. When the server is unavailable, Login shows:
"Signed out of this browser. The server could not confirm session revocation;
check your connection before signing in again." A rejected/expired token uses
the existing sign-in message without recursively calling logout. All API and
legacy private HTML responses use no-store/no-cache, including masked details.
Local verification on 2026-10-30: both US02 Edge browser cases passed using
the real API and disposable database/keys. They cover logout/token denial,
Back hiding private UI, another session remaining valid and an unavailable
logout API clearing the browser with an honest warning. OneDrive exposed the
test files as symlinks, so the tests ran from a temporary physical copy
outside OneDrive while targeting this checkout's app/configuration.
Independent human acceptance and GitHub CI/review remain separate.

![Manager notification stays read after reopening](images/ui/p2-notifications-read-persisted.png)

![Exactly two persisted attempts in the Scoring history tab](images/ui/p1-history-two-attempts.png)


## 5. Public browser evidence — 11 November 2026 (Vietnam)

The following captures were supplied from the deployed HTTPS application. Desktop
captures were taken in Chrome Incognito and show the public host in the address
bar. They are visual evidence of the displayed states, not a substitute for
recording every click, API response or persistence assertion.

| Evidence | Capture | What it shows / limitation |
|---|---|---|
| Login page | ![Login page in Chrome Incognito](images/operations/live-p0-login-incognito-responsive.jpg) | Public login screen in an Incognito session with DevTools open. This is the login page, not a failed-login or successful-login result. |
| Authenticated Officer dashboard | ![Officer dashboard](images/operations/live-p0-dashboard-incognito.jpg) | Officer workspace and empty daily summary at capture time. |
| Applications list | ![Eight applications](images/operations/live-p0-applications-list-incognito-8-records.jpg) | Eight records visible in the Officer's list. |
| Valid application input | ![Valid application form](images/operations/live-p0-new-application-valid-incognito.jpg) | Populated form with income 20,000,000 VND, loan 100,000,000 VND, 24-month term, payment 5,000,000 VND and CIC group 1. Protected identifier values have been redacted in this documentation copy. |
| Scored application details | ![Score details](images/operations/live-p0-score-details-incognito.jpg) | Score 95/100, eligibility label, rules-v1 factors and application data. |
| Validation errors | ![Multiple field validation errors](images/operations/live-p0-validation-multiple-fields-incognito.jpg) | Clear field-level validation for several invalid values, including income 0. This is a multiple-error example, not an isolated income-only BR2 test. |
| Applications list after additional submissions | ![Ten applications](images/operations/live-p0-applications-list-incognito-10-records.jpg) | Ten records visible. The two list captures show different record counts; by themselves they do not prove a reload or database persistence test. |
| Responsive dashboard | ![390 by 884 responsive dashboard](images/operations/live-mobile-dashboard-390x884-devtools.jpg) | Chrome DevTools responsive viewport explicitly reports 390 × 884 CSS pixels. |
| Responsive validation | ![390 by 884 responsive validation](images/operations/live-mobile-validation-390x884-devtools.jpg) | Validation layout at the same 390 × 884 responsive viewport. |
| Physical phone dashboard | ![Physical phone dashboard](images/operations/physical-phone-dashboard.jpg) | Screenshot from a real phone browser; the visible page is the Officer dashboard. |
| Physical phone validation | ![Physical phone validation](images/operations/physical-phone-validation.jpg) | Screenshot from a real phone browser showing validation messages. |

Capture timestamps in the supplied filenames correspond to 11 November 2026
Vietnam time. The two physical-phone captures show the mobile browser's address
area; the full desktop Incognito captures show the Render host.

**Acceptance limits:** the supplied images do not independently prove (1) a
successful login click and response, (2) an isolated income=0 request returning
HTTP 422 with all other fields valid, (3) that the invalid submission created no
record, (4) that the same record survived a deliberate browser reload, or
(5) persistence after a new Render redeploy. The deployment record dated
9 November documents the earlier reload/redeploy persistence check; retain its
date and scope rather than presenting these 11 November captures as that test.
The existing local Scoring history screenshot is not a live production history
capture. No M3 Before/After or feedback evidence was supplied, so that
comparison is intentionally not claimed in this package.
