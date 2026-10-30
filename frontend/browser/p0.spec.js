import { test, expect } from "@playwright/test";
import { performance } from "node:perf_hooks";

const PASSWORD = "Demo@2026";
const VALID = { monthly_income: "20000000", loan_amount: "100000000", loan_term_months: "24",
  estimated_monthly_payment: "5000000", purpose: "P0 browser check", credit_history_note: "3 years, on time", cic_debt_group: "1" };

async function signIn(page, email = "hoang@branch.vn") {
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  const started = performance.now();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: /applications overview|Branch review overview/ })).toBeVisible();
  return performance.now() - started;
}

async function list(page) {
  return page.evaluate(async () => {
    const token = JSON.parse(sessionStorage.getItem("cs_session")).access_token;
    const response = await fetch("/api/loan-applications", { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`List failed: ${response.status}`);
    return response.json();
  });
}

async function fillApplication(page, overrides = {}) {
  await page.getByRole("navigation").getByRole("link", { name: "New application", exact: true }).click();
  await expect(page.getByRole("heading", { name: "New loan application" })).toBeVisible();
  for (const [name, value] of Object.entries({ ...VALID, ...overrides })) await page.locator(`#field-${name}`).fill(value);
}

async function submitApplication(page) {
  const saved = page.waitForResponse(r => r.url().endsWith("/api/loan-applications") && r.request().method() === "POST");
  const started = performance.now();
  await page.getByRole("button", { name: "Submit and score", exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(201);
  const application = await response.json();
  await expect(page.getByRole("heading", { name: /^Application /, level: 1 })).toBeVisible();
  return { application, saveToDetailsMs: performance.now() - started };
}

async function capture(page, info, name) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: "image/png" });
}

test("US01 login rejects invalid input, locks after three failures and opens Dashboard", async ({ page }, info) => {
  await page.goto("/");
  let requests = 0;
  page.on("request", r => { if (r.url().endsWith("/api/auth/login")) requests++; });
  await page.getByLabel("Email", { exact: true }).fill("a".repeat(245) + "@branch.vn");
  await page.getByLabel("Password", { exact: true }).fill("p".repeat(129));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#email-error")).toHaveText("Email must not exceed 254 characters.");
  await expect(page.locator("#password-error")).toHaveText("Password must not exceed 128 characters.");
  expect(requests).toBe(0);
  await page.getByLabel("Email", { exact: true }).fill("linh@branch.vn");
  await page.getByLabel("Password", { exact: true }).fill("wrong");
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Email or password is incorrect" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  }
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "locked for 15 minutes" })).toBeVisible();
  const loginMs = await signIn(page);
  expect(loginMs).toBeLessThan(2000);
  await info.attach("timing", { body: JSON.stringify({ loginMs }), contentType: "application/json" });
  await capture(page, info, "p0-officer-dashboard");
});

test("US09 invalid income names and focuses the field and never creates a record", async ({ page }, info) => {
  await signIn(page);
  const before = (await list(page)).length;
  let creations = 0;
  page.on("request", r => { if (r.url().endsWith("/api/loan-applications") && r.method() === "POST") creations++; });
  await fillApplication(page);
  for (const [income, message] of [["", "Income is required"], ["abc", "Monthly income must be a whole number."], ["0", "Monthly income must be greater than 0 VND."]]) {
    await page.locator("#field-monthly_income").fill(income);
    await page.getByRole("button", { name: "Submit and score", exact: true }).click();
    await expect(page.locator("#field-monthly_income-error")).toHaveText(message);
    await expect(page.locator("#field-monthly_income")).toBeFocused();
  }
  expect(creations).toBe(0);
  expect((await list(page)).length).toBe(before);
  await capture(page, info, "p0-income-validation");
});

test("US03 saved High risk application is visible before a slow score and scoring runs only once", async ({ page }, info) => {
  await signIn(page);
  await fillApplication(page, { monthly_income: "8000000", loan_amount: "600000000", estimated_monthly_payment: "25000000", credit_history_note: "None", cic_debt_group: "2" });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let scores = 0;
  await page.route("**/api/loan-applications/*/score", async route => { scores++; await gate; await route.continue(); });
  try {
    const { application, saveToDetailsMs } = await submitApplication(page);
    expect(saveToDetailsMs).toBeLessThan(3000);
    expect(application.status).toBe("pending");
    expect(application.dsr_flag_high_risk).toBe(true);
    await expect(page.getByText("Scoring in progress", { exact: true })).toBeVisible();
    await expect(page.locator(".alert.warn").filter({ hasText: "High risk." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Scoring...", exact: true })).toBeDisabled();
    const stored = (await list(page)).find(a => a.id === application.id);
    expect(stored.latest_score).toBeNull();
    await capture(page, info, "p0-saved-before-scoring");
    release();
    await expect(page.getByText("Recommendation Rejected", { exact: true })).toBeVisible();
    expect(await page.locator(".score li").count()).toBeGreaterThanOrEqual(2);
    expect(scores).toBe(1);
    await page.reload();
    await expect(page.getByText("Recommendation Rejected", { exact: true })).toBeVisible();
    expect(scores).toBe(1);
    await info.attach("timing", { body: JSON.stringify({ saveToDetailsMs }), contentType: "application/json" });
    await capture(page, info, "p0-rejected-score");
  } finally { release(); }
});

test("US04 score, CIC and reasons persist and the record is reachable through the list", async ({ page }, info) => {
  await signIn(page);
  await fillApplication(page);
  const { application } = await submitApplication(page);
  await expect(page.locator(".score .big")).toContainText("95");
  expect(await page.locator(".score li").count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".score")).toContainText("CIC debt group 1");
  await page.getByRole("navigation").getByRole("link", { name: "My applications", exact: true }).click();
  await page.getByRole("row").filter({ hasText: application.id.slice(0, 8) }).getByRole("link", { name: "Open", exact: true }).click();
  await expect(page.locator(".score .big")).toContainText("95");
  await capture(page, info, "p0-saved-score-and-reasons");
});

test("US03 scoring failure keeps the saved record and allows retry without a duplicate", async ({ page }) => {
  await signIn(page);
  const before = (await list(page)).length;
  await fillApplication(page);
  await page.route("**/api/loan-applications/*/score", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Scoring is temporarily unavailable. Try again." }) }), { times: 1 });
  const { application } = await submitApplication(page);
  await expect(page.getByRole("alert").filter({ hasText: "Scoring is temporarily unavailable" })).toBeVisible();
  expect((await list(page)).length).toBe(before + 1);
  expect((await list(page)).find(a => a.id === application.id).latest_score).toBeNull();
  await page.getByRole("button", { name: "Get credit score", exact: true }).click();
  await expect(page.locator(".score .big")).toContainText("95");
  expect((await list(page)).length).toBe(before + 1);
});

test("US08 zero and ten real persisted applications show the correct count and average", async ({ page }, info) => {
  await signIn(page, "p0.dashboard@branch.vn");
  await expect(page.getByText("0 applications today.", { exact: false })).toBeVisible();
  for (let number = 0; number < 10; number++) {
    await fillApplication(page, { purpose: `Dashboard ${number + 1}` });
    await submitApplication(page);
    await expect(page.locator(".score .big")).toContainText("95");
  }
  await page.getByRole("navigation").getByRole("link", { name: "My dashboard", exact: true }).click();
  await expect(page.locator(".tile").filter({ hasText: "my applications today" }).locator(".num")).toHaveText("10");
  await expect(page.locator(".tile").filter({ hasText: "average score" }).locator(".num")).toHaveText("95");
  await capture(page, info, "p0-dashboard-ten-records");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await signIn(page, "thanh@branch.vn");
  await expect(page.getByRole("link", { name: "Employees", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Manager review queue", exact: true })).toBeVisible();
  await capture(page, info, "p0-manager-dashboard");
});

test("US09 mobile keyboard validation focuses income without horizontal overflow", async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signIn(page);
  await fillApplication(page, { monthly_income: "" });
  await page.getByRole("button", { name: "Submit and score", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#field-monthly_income-error")).toHaveText("Income is required");
  await expect(page.locator("#field-monthly_income")).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, info, "p0-mobile-validation");
});
