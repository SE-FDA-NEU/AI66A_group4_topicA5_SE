# Section 1 — Chosen process and its position on the spectrum

### (a) The model
The team follows a **Hybrid Agile** model (Scrum with Plan-driven milestone gates). A single cycle (Sprint) lasts two weeks. At the start of the cycle, the team clearly divides the backlog based on specialized roles:

* **Nguyen Quang Huy:** Database Foundation, API Architecture, and Authentication.
* **Trinh Duc Thanh:** Business Logic, AI model building, and tuning (including SHAP explanations).
* **Vu Ngoc Hai:** UI Core and state management.
* **Do Quang Trung:** Ancillary UI and API Integration (connecting Frontend with Backend).

During the cycle, members develop, write tests for their respective modules, and integrate via local Pull Requests. At the end of a cycle, the team delivers a working API connected to a functional interface to conduct end-to-end testing.

### (b) The position
The team's process is positioned at **70% Agile** and **30% Plan-driven**.

* **70% Agile:** Flexibly applied to the development and tuning of the credit scoring model, allowing hyperparameters or user interfaces to be reopened and optimized every cycle.
* **30% Plan-driven:** Mandatory to maintain milestone gates—the core Database schema, sensitive data handling standards, and integration API architecture remain "frozen" for the entire semester to prevent cascading system failures.

---

# Section 2 — The five diagnostic questions

1. **Are your requirements stable or volatile?**
   The core requirements of the project (inputting profiles, calling the API, returning scores) are stable, but the performance and explainability requirements of the AI model are volatile. Training a machine learning model requires continuous experimentation with data to achieve expected metrics (such as F1 and AUC), meaning the exact final version of the model cannot be strictly defined upfront.

2. **Does the project carry safety or legal impact that would demand formal documentation and change control?**
   **Yes.** Although it is an academic project, the credit scoring problem directly involves sensitive personal data (income, credit history). Therefore, the system must enforce standardized documentation and strict change control right from the design phase to establish security boundaries, ensuring that mock data does not leak into uncontrolled environments.

3. **Is your team large and distributed, or small and co-located? How does that affect communication cost?**
   The team is small (4 members) and co-located at National Economics University. This advantage keeps the communication cost extremely low. The team can easily discuss matters in person, organize cross-code review sessions, and resolve technical blockers quickly without facing timezone or geographical barriers.

4. **Can your customer engage continuously, or only at fixed checkpoints?**
   The customer (the instructor) can only engage at fixed checkpoints during the semester rather than interacting continuously on a daily basis. This forces the team to build rigorous internal hypothetical testing scenarios to simulate end-user feedback between milestones.

5. **What do organizational culture and contract constraints allow?**
   The constraints dictate that the team must strictly adhere to four fixed evaluation milestones and a final product demo date. Consequently, the release schedule of prototypes must be tightly anchored to these deadlines to ensure a workable increment is ready at the exact time the instructor evaluates it.

---

# Section 3 — Critical thinking: risks of the opposite choice

If the team had chosen a fully **Plan-driven (Waterfall)** approach, the single biggest risk would be a **"Big Bang" integration failure** between the ML API and the user interface.

Attempting to document the entire system design on paper before writing any code would create false assumptions about the returned JSON formats, AI processing latency, or loan profile data structures. The mechanism causing damage here is that an AI model is often a "black box" that requires practical tuning; lacking an early feedback loop would cause components to mismatch. 

> **Concrete Symptom:** In the final weeks, when the frontend pushes a profile, the API would constantly throw timeout errors or fail to parse the "result explanation" string from the AI, leading to a blank interface or system crash with no time left to refactor the Backend.

---

# Section 4 — Process rules your team commits to

1. Every source code change must reach the `main` branch through a Pull Request (PR), and it requires at least one other team member to review, leave a substantive review comment, and approve before merging.
2. Sprint length is two weeks; the backlog is evaluated and re-prioritized at the start of each sprint.
3. Mock datasets containing sensitive or simulated financial information must never be committed to the repository; the `.gitignore` file must strictly block all local test data files (`.csv`, `.json`).
4. Any changes to the API and AI input/output structures after a Sprint starts must be immediately recorded in `docs/changelog.md` to ensure synchronization among all team members.