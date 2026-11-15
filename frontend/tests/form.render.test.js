// Render the grouped application form fields and the error summary.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { loadBundle } from "./render-helper.js";

let bundle;
let C;

before(async () => {
  bundle = await loadBundle(`
    import React from "react";
    import {renderToStaticMarkup} from "react-dom/server";
    import ApplicationFields from "./src/components/ApplicationFields.jsx";
    import ErrorSummary from "./src/components/ErrorSummary.jsx";
    export {ApplicationFields, ErrorSummary};
    export const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
  `);
  C = bundle.mod;
});
after(async () => { await bundle.cleanup(); });

const EMPTY = {
  monthly_income: "", loan_amount: "", loan_term_months: "", estimated_monthly_payment: "",
  purpose: "", credit_history_note: "", cic_debt_group: "", citizen_id: "", bank_account: "",
};
const noop = () => {};

test("ApplicationFields groups fields, uses a CIC select and marks four required fields", () => {
  const html = C.render(C.ApplicationFields, { form: EMPTY, setForm: noop, errors: {}, idPrefix: "field-", showIdentifiers: true });
  assert.ok(html.includes("<select") && html.includes("Not available"));
  assert.equal((html.match(/<legend/g) || []).length, 3);
  assert.equal((html.match(/class="req"/g) || []).length, 4);
  assert.ok(html.includes("Monthly income (VND)"));
  assert.ok(html.includes('class="dsr-line" aria-live="polite"'));
  assert.ok(!html.includes("Installment is"));
  assert.equal((html.match(/aria-required="true"/g) || []).length, 4);
  assert.ok(!html.includes('role="alert"'));
});

test("ApplicationFields shows the live DSR line and warns above 50%", () => {
  const form = { ...EMPTY, monthly_income: "20000000", estimated_monthly_payment: "12000000" };
  const html = C.render(C.ApplicationFields, { form, setForm: noop, errors: {}, idPrefix: "field-", showIdentifiers: true });
  assert.ok(html.includes("Installment is 60% of income"));
  assert.ok(html.includes("dsr-line warn"));
});

test("ApplicationFields uses the edit prefix and omits identifiers", () => {
  const html = C.render(C.ApplicationFields, { form: EMPTY, setForm: noop, errors: {}, idPrefix: "edit-", showIdentifiers: false });
  assert.ok(html.includes('id="edit-monthly_income"'));
  assert.ok(!html.includes("citizen_id"));
  assert.equal((html.match(/<legend/g) || []).length, 2);
});

test("ErrorSummary links to fields without repeating their messages", () => {
  const errors = { monthly_income: "Income is required", loan_amount: "Loan amount is required." };
  const html = C.render(C.ErrorSummary, { errors, idPrefix: "field-", message: "" });
  assert.ok(html.includes("Please fix these fields:"));
  assert.ok(html.includes('href="#field-monthly_income"'));
  assert.ok(!html.includes("Income is required"));
});

test("ErrorSummary shows a server message alone", () => {
  const html = C.render(C.ErrorSummary, { errors: { form: "Server busy" }, idPrefix: "field-", message: "" });
  assert.ok(html.includes("Server busy") && !html.includes("Please fix"));
  const plain = C.render(C.ErrorSummary, { errors: {}, idPrefix: "field-", message: "Boom" });
  assert.ok(plain.includes("Boom"));
});

test("ErrorSummary lists only rendered fields and keeps the message for unrendered ones", () => {
  const errors = { citizen_id: "Citizen ID is invalid", monthly_income: "Income is required" };
  const html = C.render(C.ErrorSummary, { errors, idPrefix: "edit-", message: "Server said no", fields: ["monthly_income"] });
  assert.ok(html.includes('href="#edit-monthly_income"') && !html.includes("edit-citizen_id"));
  assert.ok(html.includes("Server said no"));
  const only = C.render(C.ErrorSummary, { errors: { citizen_id: "bad" }, idPrefix: "edit-", message: "Server said no", fields: ["monthly_income"] });
  assert.ok(only.includes("Server said no") && !only.includes("Please fix"));
});
