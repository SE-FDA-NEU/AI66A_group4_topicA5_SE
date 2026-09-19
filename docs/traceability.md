# Traceability

Every screen traces back to a feature and forward to the issue that built it.
This table is the single source of truth for Milestone 1 Section 6 and for the Milestone 4 report. Keep it current — a PR that adds a route and does not update this file should not be approved.

| Route | Purpose | Access | Priority | Feature | Story issue | PR | Status |
|-------|---------|--------|----------|---------|-------------|-----|--------|
| `/` | Landing page | G | P0 | F1 - Login/Logout | US01 (#9), US02 (#19) | | Not started |
| `/dashboard` | Overview of the number of applications and the average score for the day | U | P0 | F2 - Overview Dashboard | US08 (#13) | | Not started |
| `/loan-applications/new` | Create a new loan application | U | P0 | F3 - Loan Application Entry & Validation | US03 (#10), US09 (#14) | | Not started |
| `/loan-applications/:id` | View application details: information, score, explanation, and history | U | P0 | F4 - Scoring & Result Explanation | US04 (#11), US05 (#20) | | Not started |
| `/loan-applications` | List of all processed loan applications | U | P1 | F5 - Application History & Management | US06 (#12), US10 (#22) | | Not started |
| `/admin/users` | Manage employee accounts | A | P2 | F6 - User Administration | **(no issue yet — an additional P2 story needs to be created)** | | Not started |


**Access codes:** G = guest (not logged in) · U = authenticated user · A = admin

**Status:** Not started / In progress / Done

## Business rules

Numbered so that issues and tests can reference them.

| # | Rule | Enforced where | Tested by |
|---|------|----------------|-----------|
| BR1 | The returned credit score must be within the range [0, 100] | `/score` API, validate before returning the response | Model unit test |
| BR2 | Declared income must be > 0 VND; otherwise, the application is rejected before scoring | Loan application API, validate before saving to the database | API unit test |
| BR3 | An application may only be rescored a maximum of 3 times within 24 hours | `/score` API, check the number of scoring requests for the application | Scoring flow integration test |
| BR4 | Score < 40 → "Recommended for rejection"; 40–69 → "Requires further review"; ≥ 70 → "Eligible for recommendation" | Business logic layer (scoring service) | Model + API unit tests |
| BR5 | Do not store full Citizen ID (CCCD) numbers or bank account numbers in logs — only store the last 4 digits | Backend logging middleware | Sensitive data handling test |
| BR6 | Users may only view applications they created; Admins may view all applications within their branch | API authorization middleware (auth) | Authentication & authorization unit tests |