import { test, expect } from "@playwright/test";

const VALID = { monthly_income: 20000000, loan_amount: 100000000, loan_term_months: 24,
  estimated_monthly_payment: 5000000, purpose: "P1/P2 browser fixture", credit_history_note: "3 years, on time", cic_debt_group: 1 };

async function signIn(page, email = "hoang@branch.vn", password = "Demo@2026") {
  await page.goto("/");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: /applications overview|Branch review overview/ })).toBeVisible();
}

async function request(page, path, method = "GET", body) {
  return page.evaluate(async ({ path, method, body }) => {
    const token = JSON.parse(sessionStorage.getItem("cs_session")).access_token;
    const response = await fetch(`/api${path}`, { method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`Fixture request failed: ${response.status}`);
    return response.status === 204 ? null : response.json();
  }, { path, method, body });
}

async function pendingFixture(page) {
  // The story starts with an unprocessed record. Set up that precondition through
  // the real create API, then perform all edits/cancellation/history actions in UI.
  return request(page, "/loan-applications", "POST", VALID);
}

async function openFromList(page, id, manager = false) {
  await page.getByRole("navigation").getByRole("link", { name: manager ? "Branch applications" : "My applications", exact: true }).click();
  await page.getByRole("row").filter({ hasText: id.slice(0, 8) }).getByRole("link", { name: manager ? "Review" : "Open", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^Application / })).toBeVisible();
}

async function capture(page, info, name) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: "image/png" });
}

test("US02 logout hides cached pages and revokes only that browser session", async ({ page, browser }) => {
  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await signIn(other);
    await signIn(page);
    const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem("cs_session")).access_token);
    await page.getByRole("navigation").getByRole("link", { name: "New application", exact: true }).click();
    const revoked = page.waitForResponse(response => response.url().endsWith("/api/auth/logout"));
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    expect((await revoked).status()).toBe(204);
    await expect(page.getByRole("heading", { name: "Sign in to your account", exact: true })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("cs_session"))).toBeNull();
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Sign in to your account", exact: true })).toBeVisible();
    await expect(page.locator(".topbar, .tiles")).toHaveCount(0);
    const response = await page.request.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    expect(response.status()).toBe(401);
    expect((await request(other, "/auth/me")).role).toBe("user");
  } finally { await otherContext.close(); }
});

test("US02 unavailable logout API clears the browser and reports unconfirmed revocation", async ({ page }) => {
  await signIn(page);
  const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem("cs_session")).access_token);
  await page.route("**/api/auth/logout", route => route.abort("failed"));
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in to your account", exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(
    "Signed out of this browser. The server could not confirm session revocation; check your connection before signing in again.",
  );
  expect(await page.evaluate(() => sessionStorage.getItem("cs_session"))).toBeNull();
  await expect(page.locator(".topbar, .tiles")).toHaveCount(0);
  // The blocked request never reached the API: local sign-out must not promise
  // server revocation. This retained token is only a disposable test credential.
  const response = await page.request.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  expect(response.status()).toBe(200);
});

test("US05 details are reachable from the list and a missing application gives a useful error", async ({ page }) => {
  await signIn(page);
  const loan = await pendingFixture(page);
  await openFromList(page, loan.id);
  await expect(page.getByText("20,000,000 VND", { exact: true })).toBeVisible();
  await expect(page.getByText("3 years, on time", { exact: true })).toBeVisible();
  await page.goto("/loan-applications/nonexistent-application");
  await expect(page.getByRole("alert")).toContainText("Application not found");
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Back to the list", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My applications", exact: true })).toBeVisible();
});

test("US06 history tab shows empty state and exactly two persisted attempts", async ({ page }, info) => {
  await signIn(page);
  const loan = await pendingFixture(page);
  await openFromList(page, loan.id);
  await page.getByRole("tab", { name: "Scoring history", exact: true }).click();
  await expect(page.getByText("No history available", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Application details", exact: true }).click();
  await page.getByRole("button", { name: "Get credit score", exact: true }).click();
  await expect(page.locator(".score .big")).toContainText("95");
  await page.getByRole("button", { name: "Score again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Score again", exact: true })).toBeEnabled();
  await page.getByRole("tab", { name: "Scoring history", exact: true }).click();
  await expect(page.locator("#history-panel tbody tr")).toHaveCount(2);
  await page.reload();
  await page.getByRole("tab", { name: "Scoring history", exact: true }).click();
  await expect(page.locator("#history-panel tbody tr")).toHaveCount(2);
  await expect(page.locator("#history-panel")).toContainText("rules-v1");
  await capture(page, info, "p1-history-two-attempts");
});

test("US07 Manager receives a new notification and read status survives reopening", async ({ page, browser }, info) => {
  const otherContext = await browser.newContext();
  try {
    await signIn(page, "thanh@branch.vn");
    const baseline = (await request(page, "/notifications")).unread_count;
    const other = await otherContext.newPage();
    await signIn(other);
    const loan = await pendingFixture(other);
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    const link = page.getByRole("navigation").getByRole("link", { name: `Notifications (${baseline + 1})`, exact: true });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page.getByRole("heading", { name: "Review notifications", exact: true })).toBeVisible();
    const row = page.locator(".notification-list li").filter({ hasText: loan.id.slice(0, 8) });
    await expect(row.getByText("Unread", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Mark as read", exact: true }).click();
    await expect(row.getByText("Read", { exact: true })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: `Notifications (${baseline})`, exact: true })).toBeVisible();
    await page.reload();
    await expect(row.getByText("Read", { exact: true })).toBeVisible();
    await capture(page, info, "p2-notifications-read-persisted");
    await row.getByRole("button", { name: "Open application", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: /^Application / })).toBeVisible();
  } finally { await otherContext.close(); }
});

test("US10 edit and confirm cancellation of an unprocessed application", async ({ page }, info) => {
  await signIn(page);
  const loan = await pendingFixture(page);
  await openFromList(page, loan.id);
  await page.getByRole("button", { name: "Edit application", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit application", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Monthly income (VND)", exact: true }).fill("0");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator("#edit-monthly_income-error")).toHaveText("Monthly income must be greater than 0 VND.");
  await page.getByRole("textbox", { name: "Monthly income (VND)", exact: true }).fill("9000000");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("9,000,000 VND", { exact: true })).toBeVisible();
  await expect(page.locator(".alert.warn").filter({ hasText: "High risk." })).toBeVisible();
  await capture(page, info, "p1-edited-pending-application");
  await page.getByRole("button", { name: "Cancel application", exact: true }).click();
  await page.getByRole("button", { name: "Confirm cancellation", exact: true }).click();
  await expect(page.locator("h1 .badge")).toHaveText("Cancelled");
  await page.reload();
  await expect(page.locator("h1 .badge")).toHaveText("Cancelled");
  await expect(page.getByRole("button", { name: "Get credit score", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await signIn(page, "thanh@branch.vn");
  await page.getByRole("link", { name: "Open review queue", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: loan.id.slice(0, 8) })).toHaveCount(0);
});

test("US10 an approved application refuses editing in the interface", async ({ page }) => {
  await signIn(page);
  const loan = await pendingFixture(page);
  await openFromList(page, loan.id);
  await page.getByRole("button", { name: "Get credit score", exact: true }).click();
  await expect(page.locator(".score .big")).toContainText("95");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await signIn(page, "thanh@branch.vn");
  await openFromList(page, loan.id, true);
  await page.getByRole("button", { name: "Approve application", exact: true }).click();
  await page.getByRole("button", { name: "Confirm approval", exact: true }).click();
  await expect(page.getByText(/Approved by Do Hong Thanh/)).toBeVisible();
  await page.goto(`/loan-applications/${loan.id}/edit`);
  await expect(page.getByRole("alert")).toHaveText("Application already processed, cannot be edited");
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toHaveCount(0);
});

// Returns the short id of the first list row with a numeric score >= minScore and the given status text.
async function findScoredRow(page, minScore, status) {
  return page.locator("table").evaluate((table, { minScore, status }) => {
    const headers = [...table.querySelectorAll("thead th")].map(th => th.textContent.trim());
    const scoreAt = headers.indexOf("Score");
    const statusAt = headers.indexOf("Status");
    if (scoreAt < 0 || statusAt < 0)
      throw new Error(`Score/Status header not found; headers: ${JSON.stringify(headers)}`);
    for (const row of table.querySelectorAll("tbody tr")) {
      const cells = row.querySelectorAll("td");
      const text = cells[scoreAt].textContent.trim();
      const score = Number(text);
      if (/^\d+(\.\d+)?$/.test(text) && Number.isFinite(score) && score >= minScore && (!status || cells[statusAt].textContent.includes(status)))
        return cells[0].querySelector("strong").textContent.trim().replace("#", "");
    }
    return null;
  }, { minScore, status });
}

test("US04 detail page shows data beside score and decision", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, "thanh@branch.vn");
  await page.getByRole("link", { name: "Open review queue", exact: true }).click();
  await expect(page).toHaveURL(/view=review/);
  await expect(page.getByRole("heading", { name: "Branch applications", exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  const shortId = await findScoredRow(page, 70, "Scored");
  expect(shortId).toBeTruthy();
  await page.getByRole("row").filter({ hasText: shortId.slice(0, 8) }).getByRole("link", { name: "Review", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^Application / })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Manage application" })).toHaveCount(0);
  const side = page.locator(".detail-side");
  const main = page.locator(".detail-main");
  const sideBox = await side.boundingBox();
  const mainBox = await main.boundingBox();
  expect(sideBox.x).toBeGreaterThan(mainBox.x);
  await expect(side.getByText(/Model/).first()).toBeVisible();
  expect(await page.getByText(/High risk\./).count()).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: "Approve application", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the list", exact: true })).toHaveAttribute("href", /^\/loan-applications\?view=review$/);

  await page.setViewportSize({ width: 1440, height: 700 });
  expect(await side.evaluate(el => getComputedStyle(el).overflowY)).toBe("visible");

  await page.setViewportSize({ width: 390, height: 844 });
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  expect((await side.boundingBox()).y).toBeLessThan((await main.boundingBox()).y);
  const approve = page.getByRole("button", { name: "Approve application", exact: true });
  await approve.scrollIntoViewIfNeeded();
  await expect(approve).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await signIn(page);
  await page.getByRole("navigation").getByRole("link", { name: "My applications", exact: true }).click();
  await expect(page).toHaveURL(/\/loan-applications(\?|$)/);
  await expect(page.getByRole("heading", { name: "My applications", exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  const ownId = await findScoredRow(page, 0);
  expect(ownId).toBeTruthy();
  await openFromList(page, ownId);
  await expect(page.locator(".detail-side")).toBeVisible();
  await expect(page.locator(".detail-side")).not.toContainText("Model");

  await page.goto("/dashboard");
  await page.getByRole("link", { name: /^(Open|Get credit score)$/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: /^Application / })).toBeVisible();
  await page.getByRole("link", { name: "Back to the dashboard", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("shell is usable at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signIn(page);
  await page.goto("/dashboard");
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  const toggle = page.getByRole("button", { name: "Menu" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const link = page.getByRole("navigation").getByRole("link", { name: "My applications" });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/loan-applications$/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.locator("a.brand").focus();
  await page.keyboard.press("Tab");
  await expect(toggle).toBeFocused();
  const outline = await toggle.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
});

// The single collapse breakpoint is 1280px (the Manager bar needs ~1170px on Windows fonts; Linux fonts run wider).
async function expectNoWrap(page) {
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  const box = await page.locator(".topbar").boundingBox();
  expect(box.height).toBeLessThanOrEqual(57);
  const heights = await page.locator(".topbar nav a").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  expect(heights.length).toBe(5);
  for (const h of heights) expect(h).toBeLessThanOrEqual(40);
}

for (const width of [1366, 1440]) {
  test(`Manager top bar stays on one row at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page, "thanh@branch.vn");
    await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
    await expect(page.locator(".topbar").getByRole("navigation")).toBeVisible();
    await expectNoWrap(page);
    // A long real name must not wrap or grow the bar either.
    await page.evaluate(() => { document.querySelector(".user-name-text").textContent = "Nguyen Thi Thanh Huong"; });
    await expect(page.locator(".user-name-text")).toHaveAttribute("title", "Do Hong Thanh");
    await expectNoWrap(page);
  });
}

for (const width of [1280, 768]) {
  test(`Manager nav collapses behind Menu at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page, "thanh@branch.vn");
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(fits).toBe(true);
    const toggle = page.getByRole("button", { name: "Menu" });
    await expect(toggle).toBeVisible();
    await expect(page.locator(".topbar").getByRole("navigation")).toBeHidden();
    await toggle.click();
    await expect(page.locator(".topbar").getByRole("navigation")).toBeVisible();
  });
}

test("US08 officer dashboard lists work that needs action", async ({ page }) => {
  // A fresh Officer has no other actionable rows, so the 8-row "Needs my action" cap cannot hide the fixture.
  const email = `needs.action.${Date.now()}@branch.vn`;
  await signIn(page, "thanh@branch.vn");
  await request(page, "/admin/users", "POST", { email, full_name: "Needs Action Officer", password: "Needs-Action-2026" });
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await signIn(page, email, "Needs-Action-2026");
  await page.getByRole("navigation").getByRole("link", { name: "New application", exact: true }).click();
  await expect(page.getByRole("heading", { name: "New loan application" })).toBeVisible();
  for (const [name, value] of Object.entries({ ...Object.fromEntries(Object.entries(VALID).map(([k, v]) => [k, String(v)])), purpose: "Needs action fixture" })) {
    if (name === "cic_debt_group") await page.locator(`#field-${name}`).selectOption(value);
    else await page.locator(`#field-${name}`).fill(value);
  }
  await page.route("**/api/loan-applications/*/score", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Scoring is temporarily unavailable. Try again." }) }), { times: 1 });
  const saved = page.waitForResponse(r => r.url().endsWith("/api/loan-applications") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Submit and score", exact: true }).click();
  const loan = await (await saved).json();
  await expect(page.getByRole("alert").filter({ hasText: "Scoring is temporarily unavailable" })).toBeVisible();
  const shortId = loan.id.slice(0, 8);
  await page.locator(".topbar").getByRole("link", { name: "My dashboard", exact: true }).click();
  const card = () => page.locator(".card").filter({ has: page.getByRole("heading", { name: "Needs my action", exact: true }) });
  const row = card().getByRole("row").filter({ hasText: shortId });
  await row.getByRole("link", { name: "Get credit score", exact: true }).click();
  await expect(page.locator(".score .big")).toBeVisible();
  await page.locator(".topbar").getByRole("link", { name: "My dashboard", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Needs my action", exact: true })).toBeVisible();
  await expect(card().getByRole("row").filter({ hasText: shortId })).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 812 });
  expect((await page.locator(".tiles .tile").first().boundingBox()).height).toBeLessThan(140);
});

test("US07 manager dashboard chips open the matching list filter", async ({ page }) => {
  await signIn(page, "thanh@branch.vn");
  const chip = page.getByRole("navigation", { name: "Review filters" }).getByRole("link", { name: /High risk, awaiting review/ });
  const count = (await chip.locator(".count").innerText()).trim();
  await chip.click();
  await expect(page).toHaveURL(/view=high-risk/);
  await expect(page.locator('p[role="status"]')).toHaveText(new RegExp(`^${count} `));
});

test("US08 list rows open on click and fit a phone", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, "hoang@branch.vn");
  await page.goto("/loan-applications");
  await page.locator("tbody tr").first().locator("strong").click();
  await expect(page).toHaveURL(/\/loan-applications\/[0-9a-f-]+$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/loan-applications");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  const display = await page.locator("tbody tr").first().evaluate(row => getComputedStyle(row).display);
  expect(display).toBe("block");
});

test("US11 manager manages an officer from the table", async ({ page }) => {
  const email = `table.officer.${Date.now()}@branch.vn`;
  await signIn(page, "thanh@branch.vn");
  await page.locator(".topbar").getByRole("link", { name: "Employees", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Employee accounts", exact: true })).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Table Officer");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Initial password (12–128 characters)").fill("Table-Officer-2026");
  await page.getByRole("button", { name: "Create Officer", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: email });
  await expect(row).toBeVisible();
  await expect(row.getByText("Active", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: "Deactivate", exact: true }).click();
  await row.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(row.getByText("Inactive", { exact: true })).toBeVisible();
});

test("US09 form groups fields, shows DSR and links errors", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await page.locator(".topbar").getByRole("link", { name: "New application", exact: true }).click();
  await expect(page.getByRole("heading", { name: "New loan application" })).toBeVisible();
  await page.locator("#field-monthly_income").fill("20000000");
  await page.locator("#field-estimated_monthly_payment").fill("12000000");
  await expect(page.getByText("Installment is 60% of income (above the 50% limit)")).toBeVisible();
  const amount = await page.locator("#field-loan_amount").boundingBox();
  const term = await page.locator("#field-loan_term_months").boundingBox();
  expect(term.y).toBeCloseTo(amount.y, 0);
  await page.locator("#field-monthly_income").fill("");
  await page.getByRole("button", { name: "Submit and score", exact: true }).click();
  await page.locator(".alert").filter({ hasText: "Please fix these fields:" }).getByRole("link", { name: "Monthly income", exact: true }).click();
  await expect(page.locator("#field-monthly_income")).toBeFocused();
  await page.setViewportSize({ width: 375, height: 812 });
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
});

test("Manager back link falls back to the review queue when opened from Notifications", async ({ page, browser }) => {
  const otherContext = await browser.newContext();
  try {
    await signIn(page, "thanh@branch.vn");
    const other = await otherContext.newPage();
    await signIn(other);
    const loan = await pendingFixture(other);
    await page.getByRole("navigation").getByRole("link", { name: /^Notifications/ }).click();
    await page.reload();
    const row = page.locator(".notification-list li").filter({ hasText: loan.id.slice(0, 8) });
    await row.getByRole("button", { name: "Open application", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: /^Application / })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to the list", exact: true })).toHaveAttribute("href", "/loan-applications?view=review");
  } finally { await otherContext.close(); }
});

test("Manager dashboard queue renders as phone cards at 390 px", async ({ page, browser }) => {
  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await signIn(other);
    await pendingFixture(other);
    await signIn(page, "thanh@branch.vn");
    await page.setViewportSize({ width: 390, height: 844 });
    const row = page.locator("#queue-title ~ .scroll tbody tr").first();
    await expect(row).toBeVisible();
    expect(await row.evaluate((el) => getComputedStyle(el).display)).toBe("block");
  } finally { await otherContext.close(); }
});

async function expectFitsAt375(page) {
  // Navigation happens at desktop width (full top bar); only the check runs at 375 px.
  await page.setViewportSize({ width: 375, height: 812 });
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(fits).toBe(true);
}

test("no horizontal scroll at 375px on every route", async ({ page }) => {
  await signIn(page);
  const topbar = page.locator(".topbar");
  await expectFitsAt375(page); // dashboard
  const loan = await pendingFixture(page);
  await topbar.getByRole("link", { name: "My applications", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My applications" })).toBeVisible();
  await expectFitsAt375(page); // list
  await topbar.getByRole("link", { name: "New application", exact: true }).click();
  await expect(page.getByRole("heading", { name: "New loan application" })).toBeVisible();
  await expectFitsAt375(page); // new
  await openFromList(page, loan.id);
  await expectFitsAt375(page); // detail
  await page.getByRole("button", { name: "Edit application", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit application", exact: true })).toBeVisible();
  await expectFitsAt375(page); // edit
  await page.evaluate(() => { history.pushState({}, "", "/no-such-page"); dispatchEvent(new PopStateEvent("popstate")); });
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expectFitsAt375(page); // not found

  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await signIn(page, "thanh@branch.vn");
  await expectFitsAt375(page); // manager dashboard
  await topbar.getByRole("link", { name: "Branch applications", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: loan.id.slice(0, 8) })).toBeVisible();
  await expectFitsAt375(page); // manager list
  await openFromList(page, loan.id, true);
  await expectFitsAt375(page); // manager detail
  await topbar.getByRole("link", { name: /^Notifications/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Review notifications" })).toBeVisible();
  await expectFitsAt375(page); // notifications
  await topbar.getByRole("link", { name: "Employees", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Employee accounts" })).toBeVisible();
  await expectFitsAt375(page); // employees
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expectFitsAt375(page); // signed-out not found
});
