# Sprint log 3

## Sprint 3

**Sprint dates:** not recorded; the Scrum Master must enter the actual Planning/start and Review/end dates from the team's records.

**Roles:** Product Owner: Đỗ Quang Trung. Scrum Master: Nguyễn Quang Huy, different from Sprint 1 (Trịnh Đức Thành) and Sprint 2 (Vũ Ngọc Hải), as named in [README](../../README.md#team).

### Sprint goal

A person who has never seen the app can sign in, enter a loan application, see its score and explanations, and use the dashboard through the interface without typing a details URL. The running interface uses saved database records through authenticated APIs and shows clear messages when a business rule fails. A scoring recommendation and a Manager's recorded approval are separate steps; disbursement is outside this demo.

### Committed, completed and velocity

| Metric | Recorded result |
| --- | --- |
| Committed | Not confirmed: the actual Planning commitment and chosen estimation level have not been recorded. |
| Completed | Not confirmed: record the issues/stories accepted at Sprint Review, their points and any incomplete work. |
| Velocity | Not yet calculated: sum the points of accepted Done work at the same estimation level used for the actual commitment. |

These unknown results are not zero points. The proposed estimates and GitHub delivery snapshot below do not establish the Planning commitment or accepted completion. The Scrum Master must confirm the sprint dates, board link/snapshots, acceptance results and review record before filling these metrics.

### Parent stories and estimation basis

GitHub was checked directly on **2026-10-18**. The five stories used for the M3 interface walkthrough have **19 points in their issue-body estimates**, but GitHub currently classifies only four as P0 (**16 points**); Dashboard #13 is **P1** (3 points). Local requirements/UI include Dashboard in the M3 P0 walkthrough. Keep it in the demo scope and record this priority mismatch; this log does not change the GitHub issue or the requirements baseline.

| Story | GitHub issue | GitHub priority | GitHub state | Issue-body Story Points | Current interface route |
| --- | --- | --- | --- | --- | --- |
| US01 Log in | [#9](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/9) | P0 | Open | 3 | `/` |
| US03 Input a loan application | [#10](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/10) | P0 | Open | 5 | `/loan-applications/new` |
| US04 View the credit score with explanations | [#11](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/11) | P0 | Open | 5 | `/loan-applications/:id` |
| US08 Overview dashboard | [#13](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/13) | P1 | Open | 3 | `/dashboard` |
| US09 Alert on missing or malformed data | [#14](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/14) | P0 | Open | 3 | `/loan-applications/new` |

Their acceptance-criteria checkboxes are unticked. These estimates and the Closed child tasks do not establish a Planning commitment, accepted story completion or velocity. The GitHub route fields still contain older `/login`, `/application` and `/result` paths; the table deliberately shows the routes implemented in this checkout.

**Approval scope:** [#22](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/22) remains Open/P1 and describes US10 edit/cancel, with 2 Story Points in its body. Approval tasks S3-34–37 reference #22 as added scope, but its parent acceptance criteria do not yet describe approval. Delivering approval does not complete edit/cancel or earn those 2 points automatically.

### GitHub issue snapshot

The snapshot contains **53 actual task/chore issues: 38 Tasks and 15 Chores, all Closed**. The revised local plan had 53 references (39 Tasks and 14 Chores); 52 have corresponding GitHub issues. **S3-16 has no separate GitHub issue**, and GitHub has the additional chore **#194**. Internal S3 references remain stable and are not GitHub issue numbers. Task/Chore classification below follows the actual issue-title prefixes; Task issues also carry the `task` label.

Titles, assignees, states, parent references written in issue bodies and task-hour estimates below come from GitHub. Parent references are textual mappings; the inspected story sub-issue lists are empty, so this table does not claim native parent-child links have been configured.

**Points source:** the original revised local plan proposed **116 Task Points (29 per member)**. GitHub task bodies show estimated hours; board point fields were not verified. The **Local planned points** column preserves those historical estimates only. Its 38 mapped Tasks sum to **115 proposed points**, excluding the 1 point for uncreated S3-16. Neither 116 nor 115 is verified GitHub Projects points, committed points, completed points or velocity. Do not add task estimates to parent Story Points.

| Ref | GitHub issue | Actual issue title | Parent references in body | Assignee | GitHub state | Local planned points | Estimated hours in body |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S3-01 | [#96](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/96) | [Task] Add password hashing, JWT creation and the "current user" dependency | [#9](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/9) | Trung | Closed | 3 | 2 h |
| S3-02 | [#97](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/97) | [Task] Build POST /api/auth/login with the 15-minute lock after 3 wrong passwords, and GET /api/auth/me | [#9](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/9) | Trung | Closed | 3 | 2 h |
| S3-03 | [#98](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/98) | [Task] Give the 3 seed accounts a test password in seed.py | [#9](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/9) | Trung | Closed | 1 | 1 h |
| S3-04 | [#99](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/99) | [Task] Write tests for login, lock-out and protected routes (test_auth.py) | [#9](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/9) | Trung | Closed | 3 | 2 h |
| S3-05 | [#100](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/100) | [Task] Build POST /api/loan-applications with the BR3 high-risk flag and an audit event | [#10](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/10) | Trung | Closed | 3 | 2 h |
| S3-06 | [#101](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/101) | [Task] Add field-level validation with BR2 and one message per field (US09) | [#14](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/14) | Trung | Closed | 2 | 2 h |
| S3-07 | [#102](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/102) | [Task] Build GET /api/loan-applications (list) and GET /api/loan-applications/{id} with BR8 (403 and 404) | [#11](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/11) | Trung | Closed | 3 | 2 h |
| S3-08 | [#103](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/103) | [Task] Build POST /api/loan-applications/{id}/score and GET .../scores on top of the scoring service | [#11](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/11) | Trung | Closed | 2 | 1 h |
| S3-09 | [#104](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/104) | [Task] Build GET /api/dashboard/summary (today's total, average score, high-risk count) | [#13](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/13) | Trung | Closed | 2 | 2 h |
| S3-10 | [#153](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/153) | [Chore] Update design.md (API table, "What changed since M2") and update changelog.md | — | Thành | Closed | — | — |
| S3-11 | [#105](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/105) | [Task] Write scoring.py: features and the rule-based model rules-v0 | [#11](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/11) | Thành | Closed | 3 | 3 h |
| S3-12 | [#106](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/106) | [Task] Write scoring_service.py with BR4, BR5, BR1 and BR6, in the order from design.md | [#11](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/11) | Thành | Closed | 5 | 4 h |
| S3-13 | [#107](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/107) | [Task] Write unit tests for the scoring module and service (test_scoring_unit.py) | [#11](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/11) | Thành | Closed | 3 | 2 h |
| S3-14 | [#108](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/108) | [Task] Write API tests for scoring: rejected, BR1, BR4, BR5, history, 403 (test_scoring.py) | [#11](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/11) | Thành | Closed | 3 | 2 h |
| S3-15 | [#109](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/109) | [Task] Write API tests for applications: BR2, BR3, BR8, US09 messages, dashboard (test_applications.py) | [#10](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/10), [#13](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/13), [#14](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/14) | Thành | Closed | 3 | 3 h |
| S3-17 | [#154](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/154) | [Chore] Follow SETUP.md on a clean machine (frontend included) | — | Thành | Closed | — | — |
| S3-18 | [#110](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/110) | [Task] Set up the Vite + React app, router and the /api proxy | [#9](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/9) | Hải | Closed | 2 | 2 h |
| S3-19 | [#111](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/111) | [Task] Write api.js: fetch wrapper, token handling, friendly error messages | [#9](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/9) | Hải | Closed | 3 | 2 h |
| S3-20 | [#112](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/112) | [Task] Write the login state (auth.jsx), the route guard and the top bar with log out | [#9](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/9) | Hải | Closed | 3 | 2 h |
| S3-21 | [#113](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/113) | [Task] Build the Login screen with error and loading states | [#9](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/9) | Hải | Closed | 2 | 2 h |
| S3-22 | [#114](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/114) | [Task] Build the New application form with the error summary and a message under each wrong field | [#10](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/10), [#14](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/14) | Hải | Closed | 5 | 3 h |
| S3-23 | [#115](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/115) | [Task] Build the shared Loading, Error and Empty components and the global styles | [#13](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/13) | Hải | Closed | 2 | 2 h |
| S3-24 | [#155](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/155) | [Chore] Draw the Login and New application wireframes for ui.md section 2 | — | Hải | Closed | — | — |
| S3-25 | [#156](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/156) | [Chore] Update README.md (P0 stories table, test accounts) and SETUP.md (frontend steps, troubleshooting) | — | Huy | Closed | — | — |
| S3-26 | [#116](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/116) | [Task] Build the Dashboard screen in its 4 states (empty, loading, error, data) | [#13](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/13) | Huy | Closed | 3 | 2 h |
| S3-27 | [#117](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/117) | [Task] Build the Applications list screen | [#11](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/11) | Huy | Closed | 2 | 2 h |
| S3-28 | [#118](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/118) | [Task] Build the Application details screen: data and the High risk banner | [#11](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/11) | Huy | Closed | 2 | 2 h |
| S3-29 | [#119](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/119) | [Task] Show the score, label and reasons on the details screen, with "Score again" and the BR1, BR4, BR5 messages | [#11](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/11) | Huy | Closed | 3 | 3 h |
| S3-30 | [#157](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/157) | [Chore] Click through the 5 P0 stories against the real API, write down and fix integration bugs | — | Huy | Closed | — | — |
| S3-31 | [#158](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/158) | [Chore] Write ui.md section 1 (stories and status) and section 3 (error messages) | — | Thành | Closed | — | — |
| S3-32 | [#159](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/159) | [Chore] Draw the Dashboard (4 states) and Details wireframes, and write ui.md section 4 | — | Hải | Closed | — | — |
| S3-33 | [#160](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/160) | [Chore] Prepare Team04_M3.pdf: cover block, 2 board screenshots, 2 app screenshots with the address bar | — | Huy | Closed | — | — |
| S3-34 | [#135](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/135) | [Task] Implement Manager approval API and audit trail | [#22](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/22) | Trung | Closed | 5 | 2 h |
| S3-35 | [#136](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/136) | [Task] Build Manager decision and approval confirmation on details | [#22](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/22) | Huy | Closed | 3 | 2 h |
| S3-36 | [#137](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/137) | [Task] Test approval authorization, conditions and persistence | [#22](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/22) | Thành | Closed | 3 | 2 h |
| S3-37 | [#138](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/138) | [Task] Document and verify the score-to-manager-decision flow | [#22](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/22) | Trung | Closed | 2 | 1 h |
| S3-38 | [#139](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/139) | [Task] Implement encrypted Citizen ID and bank-account storage with safe schema upgrade | [#10](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/10), [#14](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/14) | Thành | Closed | 5 | 3 h |
| S3-39 | [#140](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/140) | [Task] Build masked identifiers and explicit audited lookup in the interface | [#20](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/20) | Hải | Closed | 5 | 2 h |
| S3-40 | [#141](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/141) | [Task] Implement Manager employee management and session revocation | [#9](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/9) | Huy | Closed | 5 | 2 h |
| S3-41 | [#143](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/143) | [Task] Build Manager-only Employees page and status confirmation | [#9](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/9) | Huy | Closed | 3 | 2 h |
| S3-42 | [#144](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/144) | [Task] Verify all business rules including privacy and concurrent scoring | [#10](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/10), [#11](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/11), [#14](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/14), [#9](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/9) | Huy | Closed | 5 | 3 h |
| S3-43 | [#145](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/145) | [Task] Update M3 business-rule traceability, setup and browser evidence | [#10](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/10), [#11](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/11), [#14](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/14), [#9](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/9) | Hải | Closed | 2 | 1 h |
| S3-44 | [#146](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/146) | [Task] Build distinct Officer and Manager dashboards with all-date backlog | [#13](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/13) | Huy | Closed | 3 | 3 h |
| S3-45 | [#147](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/147) | [Task] Add Manager review filters and role-specific navigation/detail guidance | [#20](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/20) | Hải | Closed | 3 | 2 h |
| S3-46 | [#148](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/148) | [Task] Test role entry points and review queue behavior | [#13](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/13), [#20](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/20) | Thành | Closed | 3 | 2 h |
| S3-47 | [#149](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/149) | [Task] Document and compare Officer and Manager workflows in browser | [#13](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/13), [#20](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/20) | Hải | Closed | 2 | 1 h |
| S3-C1 | [#161](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/161) | [Chore] Refine backlog for Sprint 3 | — | Trung | Closed | — | — |
| S3-C2 | [#162](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/162) | [Chore] Sprint 3 wrap-up | — | Huy | Closed | — | — |
| S3-C3 | [#163](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/163) | [Chore] Add PyJWT to requirements.txt and JWT_SECRET to .env.example | — | Trung | Closed | — | — |
| S3-C4 | [#164](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/164) | [Chore] Add a frontend build job to .github/workflows/ci.yml | — | Thành | Closed | — | — |
| S3-C5 | [#165](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/165) | [Chore] Ignore node_modules/ and frontend/dist/ in .gitignore | — | Hải | Closed | — | — |
| S3-C6 | [#166](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/166) | [Chore] Update traceability.md and add images to docs/images/ui/ once every task is done | — | Huy | Closed | — | — |
| — | [#194](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues/194) | [Chore] Write sprint log for sprint 3 | — | Huy | Closed | — | — |

| Member | GitHub account | Tasks | Chores | Total actual issues |
| --- | --- | --- | --- | --- |
| Trung | @macaronzz | 11 | 2 | 13 |
| Thành | @Thanh-dev-192006 | 8 | 4 | 12 |
| Hải | @HaiMeoden | 10 | 3 | 13 |
| Huy | @criticalmatt-dot | 9 | 6 | 15 |
| **Total** | | **38** | **15** | **53** |

The actual issue-count distribution is **13 / 12 / 13 / 15** for Trung / Thành / Hải / Huy. This differs from the old 13 / 13 / 13 / 14 plan because S3-16 has no issue and #194 is assigned to Huy. Assignees are not evidence of commit authorship or accepted completion. Huy's employee backend (S3-40) and BR/privacy/concurrency tests (S3-42) remain assigned to Huy.

### Plan items and evidence gaps

- **S3-16:** the proposed Sprint 4 model-plan task belongs to Thành in the local plan (1 proposed Task Point, about 1 hour, parent reference #11). The plan text exists in [design.md section 13](../design.md#13-sprint-4-model-plan), but no corresponding standalone GitHub issue was found. Exclude it from actual GitHub issue counts and do not mark it Closed or award completed points from the document alone.
- **S3-17 / #154:** the actual title is "[Chore] Follow SETUP.md on a clean machine (frontend included)"; the body asks for setup verification and fixing blockers. The extra "fill in Tested by" wording was in the local plan. #154 is Closed, while the actual M3 tester/environment/date/result still need to be recorded in [SETUP](../SETUP.md#10-tested-by).
- **#194:** "[Chore] Write sprint log for sprint 3" is an additional issue assigned to Huy and Closed by [PR #195](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/195). It has no S3 reference in the original plan and no Task Points.
- **Closed versus accepted:** wrap-up #162, PDF #160 and browser-evidence chores/tasks are Closed on GitHub. The repository still needs the actual meeting/submission/browser results listed below. Record their GitHub state and acceptance evidence separately.

### Pull requests and cross-review

Follow [process.md](../../process.md#section-4--process-rules-your-team-commits-to) and the [Definition of Done](../definition-of-done.md). Every source change reaches `main` through a PR with another member's substantive review and approval. Add actual PR links to [traceability](../traceability.md); a proposed reviewer or a merge commit alone does not establish that the required review/CI/acceptance happened.

Merge dependent work before its tests/integration: scoring service before scoring routes/tests; approval API before UI/tests; key/schema work before identifier reveal; employee API before Employees UI; review filters before role/filter tests. The old six-PR grouping and fixed merge order were only an initial proposal, not the actual PR history.

GitHub confirms that Sprint 3 log [PR #195](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/195) (Closes #194) and traceability/UI images [PR #193](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/pull/193) (Closes #166) were merged on 2026-10-18. This snapshot records delivery state before this documentation update; it does not assert that every required review, CI or browser check passed. Updating this log does not change GitHub issue state, assignees or priority.

### Result and Sprint Review

| Item | Recorded result / evidence |
| --- | --- |
| GitHub delivery state | 53 task/chore issues are Closed; the five walkthrough stories and US10 #22 remain Open. |
| Accepted issues/stories and points | Not recorded; Closed tasks do not identify the set accepted at Sprint Review or its points. |
| Clean-machine setup | Follow [SETUP](../SETUP.md); actual Sprint 3 tester, environment and result still need to be recorded. |
| P0 browser flows and deliberate rule violation | See [UI evidence and checklist](../ui.md#4-what-changed-since-m2); add actual tester/date/results. |
| Existing UI images | Five running-app screenshots are included in `docs/images/ui/` and linked from `ui.md`; screenshots do not fill every acceptance check automatically. |
| Review feedback and instructor/teammate acceptance | Not recorded. |
| Project board at Planning and submission | Actual board URL and both dated snapshots must be supplied by the team. |
| PDF submission | #160 is Closed; actual `Team04_M3.pdf`, submission date and LMS receipt/result are not recorded here. |

US06 history UI, US07 notifications, US10 edit/cancel and the trained model remain outside the completed implementation described for this sprint. Approval is implemented separately; do not mark all of US10 complete on that basis.

### Retrospective

| Keep doing | Stop doing | Start doing |
| --- | --- | --- |
| Not recorded | Not recorded | Not recorded |

**Action for Sprint 4:** not recorded; enter one action and one accountable owner after the actual retrospective. A separate `docs/retro.md` is optional; this log keeps the Sprint 3 record together.

### Attendance

| Member | Planning | Review | Retrospective |
| --- | --- | --- | --- |
| Trung | Not recorded | Not recorded | Not recorded |
| Thành | Not recorded | Not recorded | Not recorded |
| Hải | Not recorded | Not recorded | Not recorded |
| Huy | Not recorded | Not recorded | Not recorded |

### Evidence links

- [GitHub Sprint 3 issue snapshot: #96–166 plus #194](https://github.com/SE-FDA-NEU/AI66A_group4_topicA5_SE/issues) — the per-row links above identify the actual issues.
- [Sprint log entry point](../sprint-log.md)
- [Current code/test mapping](../traceability.md)
- [UI status, messages and screenshots](../ui.md)
- [Setup and browser demos](../SETUP.md)
