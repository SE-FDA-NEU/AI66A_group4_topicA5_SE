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


**Access codes:** G = guest (not logged in) · U = authenticated user · A = admin

**Status:** Not started / In progress / Done

## Business rules

Numbered so that issues and tests can reference them.

| # | Rule | Enforced where | Tested by |
|---|------|----------------|-----------|
| BR1 | Returned credit score must be in [0, 100]; out of range -> change to "Requires manual review" | API `/score`, validate before returning response | Model unit test |
| BR2 | Declared income must be > 0 VND | Loan application receiving API, validate before saving to DB | API unit test |
| BR3 | DSR (installment/income) <= 50%, exceeded -> flag as "High risk" | Business logic layer, after having loan amount + term | DSR calculation unit test |
| BR4 | CIC debt group 3-5 -> automatically rejected regardless of model score | Business logic layer, CIC data integration (if any) | Model + API unit test |
| BR5 | Maximum 3 scorings/application per hour, hitting threshold -> flag as "Requires Manager review" | API `/score`, check call count per application | Scoring flow integration test |
| BR6 | Score <40 -> "Proposal rejected"; 40-69 -> "Requires further review"; >=70 -> "Eligible for proposal" | Business logic layer (scoring service) | Model + API unit test |
| BR7 | Logs only store last 4 digits of CCCD/account; main DB encrypted at rest, log access when decrypted | Logging middleware + DB encryption layer (backend) | Sensitive data processing test |
| BR8 | Authorization for 2 roles: User (only view self-created applications) / Admin (view all branch applications + account management) | Auth API middleware | Auth & authorization unit test |