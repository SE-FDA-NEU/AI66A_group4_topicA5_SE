# UI - Credit Scoring Demo

## 1. P0 stories and status

| Story | Screen(s) | Route | Status | Issue |
| --- | --- | --- | --- | --- |
| US01 Log in with my account | Login | `/` | partly works (implemented; independent browser acceptance pending; log out is a button in the top bar; the 15-minute lock is shown as a message) | #9 |
| US03 Input a loan application | New application | `/loan-applications/new` | partly works (implemented; independent browser acceptance pending; saves, flags High risk when DSR > 50%, scores right away) | #10 |
| US04 View the credit score with explanations | Application details | `/loan-applications/:id` | partly works (implemented; independent browser acceptance pending; score 0-100, label, factors, CIC group; rule-based model `rules-v0`, the trained model comes in Sprint 4) | #11 |
| US08 Overview dashboard | Dashboard | `/dashboard` | partly works (implemented; independent browser acceptance pending; today's total, average score, high-risk count; shows "0 applications today" when empty) | #13 |
| US09 Alert on missing or malformed data | New application | `/loan-applications/new` | partly works (field errors and no-save behavior implemented; empty-income wording differs from the US09 acceptance criterion; independent browser acceptance pending) | #14 |

Also built, not P0: `/loan-applications` (list, P1, US05 partly) so a person can reach any application without typing a URL.

## 2. Wireframes

Each wireframe says why the person comes here and which API endpoints the screen calls.

### 2.1 Login `/`

"The user comes here to sign in with their branch account."
Calls: `POST /api/auth/login`

![Wireframe 1](images/ui/wireframe-1.svg)


### 2.2 Dashboard `/dashboard` (by role, all four states)

"The Officer comes here to see their own activity and create/track applications. The Manager comes here to review branch activity and the backlog, and manage employee access."
Calls: `GET /api/dashboard/summary`; Manager also calls `GET /api/loan-applications` for the review queue. All counters use database data. The daily summary is Vietnam-local today; backlog counts cover all dates.


![Dashboard wireframe](images/ui/wireframe-3.svg)

Zero applications today does not clear the Manager backlog. Approved, rejected and cancelled records are excluded from the queue. Eligible means a decision can be made, not automatically approved. Branch applications has risk/eligibility/employee filters; My applications displays the Officer's records without branch controls. Both roles retain navigation to New application because the existing API permits authenticated users to create records.

### 2.3 New application `/loan-applications/new`

"The user comes here to enter a customer's loan application and get a credit score."
Calls: `POST /api/loan-applications`, then `POST /api/loan-applications/{id}/score`

![New application wireframe](images/ui/wireframe-2.svg)

The image preserves the original required-field wording from the design. Current
empty/text income input displays "Monthly income must be a whole number."; the
US09 acceptance criterion still requires "Income is required" for an empty box.
This wording gap remains open; the acceptance criterion has not been changed.


### 2.4 Application details `/loan-applications/:id`

"The user comes here to read the score, the reasons behind it, and the data the officer entered."
Calls: `GET /api/loan-applications/{id}`, `POST /api/loan-applications/{id}/score`, `PATCH /api/loan-applications/{id}/approve` (Manager), `POST /api/loan-applications/{id}/sensitive-data/reveal` (explicit lookup)

![Wireframe 4](images/ui/wireframe-4.svg)


Manager decision wireframe (Application details, same screen purpose and APIs)

### 2.5 Protected identifiers (on application details)

"The user comes here to check the customer identifiers for an application they are permitted to open."
Calls: `POST /api/loan-applications/{id}/sensitive-data/reveal`.

![Protected identifiers wireframe](images/ui/wireframe-5.svg)

### 2.6 Employee accounts `/admin/users` (Manager only)

"The user comes here to create Officer accounts and control employee access while retaining loan history."
Calls: GET/POST `/api/admin/users`, PATCH `/api/admin/users/{id}`.

![Employee accounts wireframe](images/ui/wireframe-6.svg)

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
| `422` | US09 (empty or text income sent by the form) | "Monthly income must be a whole number." |
| `422` | US09 (API request omits `monthly_income`) | "Monthly income is required." |
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

**Open US09 wording gap:** an empty income box is sent as an empty string, so it
currently follows the whole-number error, not the required-field error. The
requirements still specify "Income is required" for this case. Rejecting the
request without saving is implemented; that exact acceptance message is not yet
implemented. Do not treat the missing-field API test as browser acceptance of an
empty form field.

## 4. What changed since M2

### Design change: a recommendation needs a separate Manager decision

Building Application details exposed the need to distinguish a model recommendation
from a Manager's recorded decision. An eligible score does not change the loan
to approved. The interface now offers Admin-only review and confirmation, backed
by `PATCH /api/loan-applications/{id}/approve`. The backend commits the approved
status and `loan.approved` audit together; detail responses expose
`approval.actor_id`, `approval.actor_name` and `approval.approved_at` so the user
can see who made the decision and when, including after reload. The High risk flag
is preserved. These API and response-contract details are updated in
[design.md, Manager approval contract](design.md#manager-approval-contract) in the
same change. 

### Design change: role-focused workspaces

The shared Dashboard did not make clear what an Officer or a Manager should do next. Officer now sees My activity, My applications and a primary New application action. Manager sees a Branch overview, a database-backed review queue across all dates, review/high-risk/eligible filters, a Created by employee filter and a Manage employees shortcut. The details page names the current role and highlights the Manager's approval decision. No API rule changed: BR8 (Officer sees own records, Manager sees all) is still enforced by the backend, and the interface does not create any permission.

| | Officer | Manager |
| --- | --- | --- |
| Navigation | My dashboard, My applications, New application | Branch overview, Branch applications, New application, Employees |
| Data scope | Own applications only (daily metrics and list) | Branch daily metrics; review queue across all dates; all employees' applications |
| Details | Can score; sees who makes the approval decision | Can approve an eligible score after confirmation |
| Not available | Approval, branch filters, Employees | Changing Manager accounts |

US07 notifications, US06 history UI and US10 edit/cancel remain pending; the review queue is not a notification feature.

**Evidence status:** five running-app screenshots are included below.

### Running-app screenshots

![Login screen](images/ui/login-screen.png)

![Officer application data, score and explanations](images/ui/officer-saved-application.png)

![Monthly income validation error](images/ui/income-validation-error.png)

![Manager filters by eligibility and employee](images/ui/manager-application-filters.png)

![Approved application with Manager name and time](images/ui/manager-approved-application.png)
