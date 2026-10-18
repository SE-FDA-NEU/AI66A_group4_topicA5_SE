# Sprint log 3

## Sprint 3 - <6/10/2026> to <18/10/2026>

Milestone 3 proves that people can use the system through its interface, with saved database data and clear messages when an error occurs.

### Sprint goal

A person who has never seen the app can sign in, enter a loan application, see its score and explanations, and use the dashboard through the interface without typing a details URL. The running interface uses saved database records through authenticated APIs and shows clear messages when a business rule fails. A scoring recommendation and a Manager's recorded approval are separate steps; disbursement is outside this demo.

### Committed

| Issue | Story | Points | Owner |
| --- | --- | --- | --- |
| [#96](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/96) | [Task] Add password hashing, JWT creation and the "current user" dependency | 3 | Trung |
| [#97](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/97) | [Task] Build POST /api/auth/login with the 15-minute lock after 3 wrong passwords, and GET /api/auth/me | 3 | Trung |
| [#98](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/98) | [Task] Give the 3 seed accounts a test password in seed.py | 1 | Trung |
| [#99](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/99) | [Task] Write tests for login, lock-out and protected routes (test_auth.py) | 3 | Trung |
| [#100](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/100) | [Task] Build POST /api/loan-applications with the BR3 high-risk flag and an audit event | 3 | Trung |
| [#101](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/101) | [Task] Add field-level validation with BR2 and one message per field (US09) | 2 | Trung |
| [#102](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/102) | [Task] Build GET /api/loan-applications (list) and GET /api/loan-applications/{id} with BR8 (403 and 404) | 3 | Trung |
| [#103](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/103) | [Task] Build POST /api/loan-applications/{id}/score and GET .../scores on top of the scoring service | 2 | Trung |
| [#104](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/104) | [Task] Build GET /api/dashboard/summary (today's total, average score, high-risk count) | 2 | Trung |
| [#153](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/153) | [Chore] Update design.md (API table, "What changed since M2") and update changelog.md | — | Thành |
| [#105](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/105) | [Task] Write scoring.py: features and the rule-based model rules-v0 | 3 | Thành |
| [#106](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/106) | [Task] Write scoring_service.py with BR4, BR5, BR1 and BR6, in the order from design.md | 5 | Thành |
| [#107](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/107) | [Task] Write unit tests for the scoring module and service (test_scoring_unit.py) | 3 | Thành |
| [#108](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/108) | [Task] Write API tests for scoring: rejected, BR1, BR4, BR5, history, 403 (test_scoring.py) | 3 | Thành |
| [#109](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/109) | [Task] Write API tests for applications: BR2, BR3, BR8, US09 messages, dashboard (test_applications.py) | 3 | Thành |
| [#154](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/154) | [Chore] Follow SETUP.md on a clean machine (frontend included) | — | Thành |
| [#110](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/110) | [Task] Set up the Vite + React app, router and the /api proxy | 2 | Hải |
| [#111](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/111) | [Task] Write api.js: fetch wrapper, token handling, friendly error messages | 3 | Hải |
| [#112](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/112) | [Task] Write the login state (auth.jsx), the route guard and the top bar with log out | 3 | Hải |
| [#113](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/113) | [Task] Build the Login screen with error and loading states | 2 | Hải |
| [#114](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/114) | [Task] Build the New application form with the error summary and a message under each wrong field | 5 | Hải |
| [#115](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/115) | [Task] Build the shared Loading, Error and Empty components and the global styles | 2 | Hải |
| [#155](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/155) | [Chore] Draw the Login and New application wireframes for ui.md section 2 | — | Hải |
| [#156](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/156) | [Chore] Update README.md (P0 stories table, test accounts) and SETUP.md (frontend steps, troubleshooting) | — | Huy |
| [#116](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/116) | [Task] Build the Dashboard screen in its 4 states (empty, loading, error, data) | 3 | Huy |
| [#117](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/117) | [Task] Build the Applications list screen | 2 | Huy |
| [#118](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/118) | [Task] Build the Application details screen: data and the High risk banner | 2 | Huy |
| [#119](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/119) | [Task] Show the score, label and reasons on the details screen, with "Score again" and the BR1, BR4, BR5 messages | 3 | Huy |
| [#157](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/157) | [Chore] Click through the 5 P0 stories against the real API, write down and fix integration bugs | — | Huy |
| [#158](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/158) | [Chore] Write ui.md section 1 (stories and status) and section 3 (error messages) | — | Thành |
| [#159](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/159) | [Chore] Draw the Dashboard (4 states) and Details wireframes, and write ui.md section 4 | — | Hải |
| [#160](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/160) | [Chore] Prepare Team04_M3.pdf: cover block, 2 board screenshots, 2 app screenshots with the address bar | — | Huy |
| [#135](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/135) | [Task] Implement Manager approval API and audit trail | 5 | Trung |
| [#136](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/136) | [Task] Build Manager decision and approval confirmation on details | 3 | Huy |
| [#137](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/137) | [Task] Test approval authorization, conditions and persistence | 3 | Thành |
| [#138](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/138) | [Task] Document and verify the score-to-manager-decision flow | 2 | Trung |
| [#139](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/139) | [Task] Implement encrypted Citizen ID and bank-account storage with safe schema upgrade | 5 | Thành |
| [#140](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/140) | [Task] Build masked identifiers and explicit audited lookup in the interface | 5 | Hải |
| [#141](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/141) | [Task] Implement Manager employee management and session revocation | 5 | Huy |
| [#143](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/143) | [Task] Build Manager-only Employees page and status confirmation | 3 | Huy |
| [#144](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/144) | [Task] Verify all business rules including privacy and concurrent scoring | 5 | Huy |
| [#145](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/145) | [Task] Update M3 business-rule traceability, setup and browser evidence | 2 | Hải |
| [#146](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/146) | [Task] Build distinct Officer and Manager dashboards with all-date backlog | 3 | Huy |
| [#147](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/147) | [Task] Add Manager review filters and role-specific navigation/detail guidance | 3 | Hải |
| [#148](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/148) | [Task] Test role entry points and review queue behavior | 3 | Thành |
| [#149](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/149) | [Task] Document and compare Officer and Manager workflows in browser | 2 | Hải |
| [#161](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/161) | [Chore] Refine backlog for Sprint 3 | — | Trung |
| [#162](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/162) | [Chore] Sprint 3 wrap-up | — | Huy |
| [#163](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/163) | [Chore] Add PyJWT to requirements.txt and JWT_SECRET to .env.example | — | Trung |
| [#164](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/164) | [Chore] Add a frontend build job to .github/workflows/ci.yml | — | Thành |
| [#165](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/165) | [Chore] Ignore node_modules/ and frontend/dist/ in .gitignore | — | Hải |
| [#166](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/166) | [Chore] Update traceability.md and add images to docs/images/ui/ once every task is done | — | Huy |
| [#194](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/194) | [Chore] Write sprint log for sprint 3 | — | Huy |

**Total committed: 115 points**

### Result

| Issue | Points | Status | If not done, why? |
| --- | --- | --- | --- |
| [#96](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/96) | 3 | Done | --- |
| [#97](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/97) | 3 | Done | --- |
| [#98](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/98) | 1 | Done | --- |
| [#99](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/99) | 3 | Done | --- |
| [#100](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/100) | 3 | Done | --- |
| [#101](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/101) | 2 | Done | --- |
| [#102](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/102) | 3 | Done | --- |
| [#103](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/103) | 2 | Done | --- |
| [#104](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/104) | 2 | Done | --- |
| [#153](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/153) | — | Done | --- |
| [#105](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/105) | 3 | Done | --- |
| [#106](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/106) | 5 | Done | --- |
| [#107](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/107) | 3 | Done | --- |
| [#108](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/108) | 3 | Done | --- |
| [#109](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/109) | 3 | Done | --- |
| [#154](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/154) | — | Done | --- |
| [#110](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/110) | 2 | Done | --- |
| [#111](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/111) | 3 | Done | --- |
| [#112](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/112) | 3 | Done | --- |
| [#113](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/113) | 2 | Done | --- |
| [#114](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/114) | 5 | Done | --- |
| [#115](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/115) | 2 | Done | --- |
| [#155](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/155) | — | Done | --- |
| [#156](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/156) | — | Done | --- |
| [#116](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/116) | 3 | Done | --- |
| [#117](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/117) | 2 | Done | --- |
| [#118](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/118) | 2 | Done | --- |
| [#119](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/119) | 3 | Done | --- |
| [#157](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/157) | — | Done | --- |
| [#158](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/158) | — | Done | --- |
| [#159](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/159) | — | Done | --- |
| [#160](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/160) | — | Done | --- |
| [#135](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/135) | 5 | Done | --- |
| [#136](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/136) | 3 | Done | --- |
| [#137](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/137) | 3 | Done | --- |
| [#138](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/138) | 2 | Done | --- |
| [#139](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/139) | 5 | Done | --- |
| [#140](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/140) | 5 | Done | --- |
| [#141](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/141) | 5 | Done | --- |
| [#143](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/143) | 3 | Done | --- |
| [#144](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/144) | 5 | Done | --- |
| [#145](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/145) | 2 | Done | --- |
| [#146](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/146) | 3 | Done | --- |
| [#147](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/147) | 3 | Done | --- |
| [#148](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/148) | 3 | Done | --- |
| [#149](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/149) | 2 | Done | --- |
| [#161](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/161) | — | Done | --- |
| [#162](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/162) | — | Done | --- |
| [#163](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/163) | — | Done | --- |
| [#164](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/164) | — | Done | --- |
| [#165](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/165) | — | Done | --- |
| [#166](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/166) | — | Done | --- |
| [#194](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/194) | — | Done | --- |

**Completed: 115 points. Velocity this sprint: Medium**

### Sprint Review

- **What we demonstrated:**
  - An authenticated React interface connected to FastAPI and SQLite: sign in, create a loan application, request scoring, open saved records from the list and view dashboard statistics. Demo accounts and synthetic seed records are stored in the database; newly created applications are persisted as well.
  - The deterministic `rules-v0` scorer returns an integer score and explanatory factors. Validation rejects invalid income without saving; the interface displays High risk, CIC rejection and hourly scoring-limit messages. A trained model remains planned for Sprint 4.
  - Different Officer and Manager workspaces: Officers see their own applications; Managers see branch data, an all-date review queue, employee/risk/eligibility filters and employee-account management.
  - A separate Manager approval decision after scoring, with confirmation, saved approver/time and the High risk flag retained. Approval does not perform disbursement. Optional Citizen ID and bank-account fields are encrypted, normally masked and revealed only through authorized, audited access.
  - Updated setup/design/UI/traceability documentation, wireframes and five [running-app screenshots](../ui.md#running-app-screenshots), including saved application data, a validation error, Manager filters and an approved application.

- **Feedback received:**
  - Scoring alone did not show who made the final decision, and the initial shared interface did not clearly distinguish Officer and Manager responsibilities. The approval flow and role-specific navigation/dashboard were added to address these points.
  - CI failures exposed incomplete dependency changes and differences between test expectations and API responses. Shared modules, exact error messages, response fields and BR7 reveal/audit behavior needed to be aligned across implementation, tests and documentation.

### Retrospective

The following lessons reflect the integration issues and changes recorded during Sprint 3.

| Keep doing | Stop doing | Start doing |
| --- | --- | --- |
| Maintain focused service, API and frontend regression tests. | Push dependent routes or tests before required modules such as `scoring_service.py` and `transactions.py` are available on the branch. | Record prerequisite PRs and verify the updated branch before requesting review. |
| Compare API responses with regression tests and user-facing messages. | Copy expected messages or response fields from a different implementation baseline. | Agree exact response/error cases and update tests, UI and documentation together. |
| Test encrypted storage, masking and audited access using synthetic data. | Define different BR7 behavior independently in backend, tests and docs. | Keep one API contract for absent identifiers, access events, permission failures and audit failures. |
| Keep distinct Officer/Manager interfaces and route-rendering checks. | Treat hidden buttons or passing API tests as complete browser acceptance. | Record both-role walkthroughs covering queue filters, approval, access separation and persistence after reload. |

### Attendance

| Member | Planning | Review | Retro |
| --- | --- | --- | --- |
| Trung | ✓ | ✓ | ✓ |
| Thành | ✓ | ✓ | ✓ |
| Hải | ✓ | ✓ | ✓ |
| Huy | ✓ | ✓ | ✓ |
