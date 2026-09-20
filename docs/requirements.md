# Requirements — Credit Scoring Demo

## 1. Product vision

A system tailored for **credit assessment officers and branch managers** at small to medium-sized financial institutions/banks — enabling them to input loan applications and instantly receive credit scores accompanied by clear explanations, replacing manual fragmented spreadsheet calculations or waiting for manual data scientist approvals, which are slow and lead to inconsistent decisions across personnel.

## 2. Personas

### Persona 1 — Do Hong Thanh, 45 years old

With over 5 years of management experience, every morning Thanh must check the total number of pending/backlogged applications, the list of high-risk application warnings, and the expected disbursement volume for the day/week. Thanh's biggest challenge is "Time" when balancing between application approval speed and bad debt risk control.

**Role:** Branch Manager

**Goal:** Quickly approve daily loan applications while keeping risks strictly under control

**Blocked by:** Limited time to handle the workload; concerns that the automated AI system cannot clearly explain the reasons behind its credit decisions.

**In their own words:** "I cannot trust an automated AI approval system if it cannot clearly explain the reasons for its results."

**Technical skill:** Familiar with using a daily dashboard to view overview metrics. Needs a transparent system capable of tracking the processing timeline of each approval step.

**Interview notes:** Interviewed by Do Quang Trung, on Sep 9, 2026, conducted in person.

### Persona 2 — Do Viet Hoang, 24 years old

With 2 years of experience in the profession, Hoang processes an average of 1 to 3 applications per day. The operation that makes Hoang feel most cumbersome and time-consuming right now is having to manually type or re-enter information from hard copies, such as ID cards or land use rights certificates, into the system.

**Role:** Credit Underwriting Officer

**Goal:** Input and score applications rapidly without manual calculation

**Blocked by:** Manual data entry from hard copies takes too much time.

**In their own words:** "Retyping every line of information from a land certificate or ID card into the system is really cumbersome. When there's an input error, I want the system to still allow saving as a draft but display a pop-up summarizing the errors that need fixing."

**Technical skill:** Needs a system with detailed tracking features to know which user modified the data and at what time. For AI applications, Hoang does not need a detailed formula explanation but requires the AI to display the score along with a list of key factors pulling the score up or down (e.g., due to group 2 debt, or unstable income). Needs an intuitive interface that supports warning pop-ups for data entry errors.

**Interview notes:** Interviewed by Do Quang Trung, on Sep 9, 2026, conducted via phone call.

## 3. Scenarios

### Scenario 1 — Hoang inputs and scores a new loan application

1. Hoang receives loan application details from a walk-in customer: income, credit history, loan purpose.
2. He opens the system and logs in with his employee credentials.
3. He selects the option to create a new loan application.
4. He inputs complete information regarding income, credit history, and relevant customer data.
5. He submits the application for automated scoring.
6. The system returns a credit score along with the primary factors driving that score.
7. He reviews the explanations and cross-checks them against his actual knowledge of the customer.
8. He saves the outcome and forwards the application to the next review stage.

### Scenario 2 — Thanh reviews a low-score application

1. Thanh receives a notification about a new application pending review.
2. She logs into the system using her manager credentials.
3. She opens the dashboard to inspect pending applications.
4. She selects the application with the lowest credit score of the day.
5. She reviews the detailed score breakdown and the rationale provided by the system.
6. She compares these insights with the customer's raw income and credit history data.
7. She checks the historical scoring records of this application (if available).
8. She decides whether to uphold the assessment or request the loan officer to gather supplementary information.

## 4. User stories

| ID | Story | Priority | Points |
| --- | --- | --- | --- |
| US01 | As an employee, I want to log in with my account so that I can access the system | P0 | 3 |
| US02 | As an employee, I want to log out so that system data is protected when I leave my workstation | P2 | 1 |
| US03 | As an underwriter, I want to input loan applications (income, credit history) so that the system can score them | P0 | 5 |
| US04 | As an underwriter, I want to view credit scores along with explanations so that I understand why an application received that score | P0 | 5 |
| US05 | As an employee, I want to view the details of a scored application so that I can cross-check information | P1 | 2 |
| US06 | As an employee, I want to view the scoring history of an application so that I can track changes over time | P1 | 3 |
| US07 | As a manager, I want to receive notifications when new applications need review so that none are missed | P2 | 2 |
| US08 | As an employee, I want to view an overview Dashboard showing total applications and average scores for the day | P0 | 3 |
| US09 | As an underwriter, I want the system to alert me when input data is missing or malformed to prevent inaccurate scoring | P0 | 3 |
| US10 | As an underwriter, I want to edit or cancel an unprocessed loan application to correct mistaken entries | P1 | 2 |

### Acceptance criteria

**US01 — Login**
- Given an account `hoang@branch.vn` with valid credentials, when logging in, then the system redirects to the Dashboard in under **2 seconds**.
- Given an invalid password entered **3 consecutive times**, when attempting a 4th login, then the account is temporarily locked for 15 minutes.

**US02 — Logout**
- Given an active session, when selecting logout, then the session terminates and the user is redirected to `/`.
- Given a logged-out state, when clicking the browser's Back button, then the system must not display cached Dashboard data.

**US03 - Input loan application**
- Given an empty application input form, when fully filling in income, **loan amount, loan term**, credit history, loan purpose and clicking Submit, then the application is saved with the status "Scoring in progress" in under **3 seconds**.
- Given the entered income is **0 VND**, when clicking Submit, then the system immediately rejects the application and does not call the scoring model (BR2).
- Given the loan amount and term cause **DSR to exceed 50%** (BR3), when clicking Submit, then the application is still saved but is flagged as "High risk" right upon creation, even before having a model score.

**US04 — View credit score with explanation**
- Given a scored application, when opening application details, then the score is displayed as an integer between **0–100**, include the **CIC debt classification** (if applicable) in the explanation.
- Given a score below **40**, when viewing results, then the system displays a "Recommendation Rejected" label along with at least **2 primary reasons**.

**US05 — View scored application details**
- Given application #`ID` exists, when accessing `/loan-applications/:id`, then complete income, credit history, score, and stored explanations are displayed.
- Given an application does not exist, when navigating directly to the URL, then the system returns an "Application not found" error message instead of a blank page.

**US06 — View scoring history**
- Given an application that has been scored **twice**, when opening the history tab, then exactly 2 entries are displayed with corresponding timestamps and scores.
- Given an application that has never been scored, when opening the history tab, then "No history available" is displayed.

**US07 — Receive new application notifications**
- Given a newly submitted application, when the manager opens the system within **5 minutes** afterwards, then the notification counter increments by 1.
- Given that the manager has read the notification, when reopening the list, then that notification is no longer marked as "unread".

**US08 — Overview Dashboard**
- Given **10 applications** processed during the day, when opening the Dashboard, then the total application count correctly displays 10.
- Given no applications processed during the day, when opening the Dashboard, then "0 applications" is displayed instead of empty states or errors.

**US09 — Validate input data**
- Given an empty income field, when clicking Submit, then the system flags an error specifying the field name: "Income is required".
- Given an income entered as text (non-numeric), when clicking Submit, then the system rejects the submission and does not save the record to the database.

**US10 — Edit/cancel unprocessed application**
- Given an application in "Scoring" status, when an employee selects Cancel, then the application transitions to "Cancelled" status and is removed from the pending review list.
- Given an application in "Approved" status, when an employee attempts to edit, then the system rejects the action with the message "Application already processed, cannot be edited".

## 5. Business rules

| ID | Rule | Worked example |
| --- | --- | --- |
| BR1 | The returned credit score must be in the range **[0, 100]**. If out of range, the application status changes to **"Requires manual review"**, and the score must not be displayed to the user | Model calculates 132 -> system blocks, logs error, changes application #88 to "Requires manual review" instead of displaying incorrect score |
| BR2 | Declared income must be **> 0 VND** | Application declares 0 VND income -> system returns "Invalid application", does not call scoring API |
| BR3 | **Debt/Income Ratio (DSR)** = (estimated installment / monthly income) must not exceed **50%**; if exceeded, the application is automatically flagged as "High risk" regardless of the model score | Income 20 million/month, loan 500 million, estimated installment 15 million/month -> DSR = 75% -> flagged as "High risk", requires Manager review even if model score is 80 |
| BR4 | The scoring result must cross-reference the customer's **CIC debt group** if available; applications in **debt groups 3-5** (bad debt) are **automatically rejected**, regardless of the model score | Customer in CIC debt group 4, model scores 82 points -> application is still rejected because debt groups 3-5 are always rejected |
| BR5 | An application can only be re-scored a maximum of **3 times in 1 hour** (anti-probing/gaming the model). Hitting the threshold -> application is automatically flagged **"Requires Manager review"**, not just silently blocked | Application #120 calls scoring at 9:00, 9:15, 9:20 -> the 4th call at 9:25 is blocked and flagged "Requires Manager review" |
| BR6 | Score **< 40** -> receives "Proposal rejected"; **40-69** -> "Requires further review"; **>= 70** -> "Eligible for proposal" | Application gets 35 points -> automatically labeled "Proposal rejected", no further Manager approval needed |
| BR7 | Do not store full ID card (CMND/CCCD) numbers or bank account numbers in **system logs** - only store the last 4 digits. In the **main database**, these fields must be **encrypted at rest**, and only decrypted upon valid lookup requests with access logged | CCCD 001234567890 entered into form -> log only records *******7890; stored in DB in encrypted format, anyone viewing plain text is logged "user X viewed CCCD of application #45 at 10:03" |
| BR8 | Employees (role **User**) can only view applications created by themselves; Managers (role **Admin**) can view all branch applications, including employee account management | Employee Hoang (User) creates application #45 -> other employees (role User) cannot see application #45; Manager Thanh (Admin) can see all |

## 6. Screens and flow

| Route | Purpose | Access | Priority |
| --- | --- | --- | --- |
| `/` | Login page | G | P0 |
| `/dashboard` | Daily application count and average score overview | U | P0 |
| `/loan-applications/new` | New loan application entry | U | P0 |
| `/loan-applications/:id` | View 1 application details: data, score, explanation, CIC debt classification group history | U | P0 |
| `/loan-applications` | List of all processed applications | U | P1 |
| `/admin/users` | Employee account management | A | P2 |

**Flow diagram:** see `docs/images/screen-flow.png`

![Screen flow](images/screen-flow.png)