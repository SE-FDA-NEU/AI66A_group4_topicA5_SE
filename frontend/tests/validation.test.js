import test from "node:test";
import assert from "node:assert/strict";
import { validateApplication } from "../src/validation.js";

const VALID = {
  monthly_income: "20000000", loan_amount: "100000000", loan_term_months: "24",
  estimated_monthly_payment: "5000000", purpose: "", credit_history_note: "",
  cic_debt_group: "", citizen_id: "", bank_account: "",
};
const check = (patch) => validateApplication({ ...VALID, ...patch });
const MAX = "10000000000000";
const OVER = "10000000000001";

test("TC-US09-21 a valid form returns no errors", () => {
  assert.deepEqual(validateApplication(VALID), {});
});

test("TC-US09-22 empty form reports the four required fields", () => {
  const errors = validateApplication({});
  assert.deepEqual(errors, {
    monthly_income: "Income is required",
    loan_amount: "Loan amount is required.",
    loan_term_months: "Loan term is required.",
    estimated_monthly_payment: "Estimated monthly payment is required.",
  });
});

test("TC-US09-23 whitespace-only income is required", () => {
  for (const value of ["", "   ", "\t\n", null]) {
    assert.equal(check({ monthly_income: value }).monthly_income, "Income is required");
  }
});

test("TC-US09-24 text and decimals are not whole numbers", () => {
  assert.equal(check({ monthly_income: "abc" }).monthly_income, "Monthly income must be a whole number.");
  assert.equal(check({ loan_amount: "1.5" }).loan_amount, "Loan amount must be a whole number.");
  assert.equal(check({ loan_term_months: "1_0" }).loan_term_months, "Loan term must be a whole number.");
  assert.equal(
    check({ estimated_monthly_payment: "12a" }).estimated_monthly_payment,
    "Estimated monthly payment must be a whole number.",
  );
});

test("TC-US09-25 income must be greater than 0 VND, 1 accepted", () => {
  assert.equal(check({ monthly_income: "0" }).monthly_income, "Monthly income must be greater than 0 VND.");
  assert.equal(check({ monthly_income: "-5" }).monthly_income, "Monthly income must be greater than 0 VND.");
  assert.equal(check({ monthly_income: "1" }).monthly_income, undefined);
});

test("TC-US09-26 loan, term and payment must be greater than 0", () => {
  assert.equal(check({ loan_amount: "0" }).loan_amount, "Loan amount must be greater than 0.");
  assert.equal(check({ loan_term_months: "0" }).loan_term_months, "Loan term must be greater than 0.");
  assert.equal(
    check({ estimated_monthly_payment: "0" }).estimated_monthly_payment,
    "Estimated monthly payment must be greater than 0.",
  );
});

test("TC-US09-27 money upper limit 10^13 accepted, one above rejected", () => {
  assert.equal(check({ monthly_income: MAX }).monthly_income, undefined);
  assert.equal(check({ monthly_income: OVER }).monthly_income, "Monthly income must not exceed 10000000000000.");
  assert.equal(
    check({ loan_amount: OVER, estimated_monthly_payment: "1" }).loan_amount,
    "Loan amount must not exceed 10000000000000.",
  );
  assert.equal(
    check({ estimated_monthly_payment: OVER }).estimated_monthly_payment,
    "Estimated monthly payment must not exceed 10000000000000.",
  );
});

test("TC-US09-28 very long digit strings do not crash and exceed the limit", () => {
  assert.equal(
    check({ monthly_income: "9".repeat(60) }).monthly_income,
    "Monthly income must not exceed 10000000000000.",
  );
});

test("TC-US09-29 loan term limit 600 accepted, 601 rejected", () => {
  assert.equal(check({ loan_term_months: "600" }).loan_term_months, undefined);
  assert.equal(check({ loan_term_months: "601" }).loan_term_months, "Loan term must not exceed 600.");
});

test("TC-US09-30 CIC debt group blank is allowed, 1 to 5 accepted", () => {
  assert.equal(check({ cic_debt_group: "" }).cic_debt_group, undefined);
  assert.equal(check({ cic_debt_group: "  " }).cic_debt_group, undefined);
  assert.equal(check({ cic_debt_group: "1" }).cic_debt_group, undefined);
  assert.equal(check({ cic_debt_group: "5" }).cic_debt_group, undefined);
});

test("TC-US09-31 CIC debt group below 1, above 5 and text are rejected", () => {
  assert.equal(check({ cic_debt_group: "0" }).cic_debt_group, "CIC debt group must be at least 1.");
  assert.equal(check({ cic_debt_group: "6" }).cic_debt_group, "CIC debt group must not exceed 5.");
  assert.equal(check({ cic_debt_group: "x" }).cic_debt_group, "CIC debt group must be a whole number.");
});

test("TC-US09-32 purpose and credit history: 500 chars accepted, 501 rejected", () => {
  assert.deepEqual(check({ purpose: "a".repeat(500), credit_history_note: "b".repeat(500) }), {});
  assert.equal(check({ purpose: "a".repeat(501) }).purpose, "Loan purpose must not exceed 500 characters.");
  assert.equal(
    check({ credit_history_note: "b".repeat(501) }).credit_history_note,
    "Credit history must not exceed 500 characters.",
  );
});

test("TC-US09-33 text length is measured after trimming", () => {
  assert.equal(check({ purpose: ` ${"a".repeat(500)} ` }).purpose, undefined);
});

test("TC-US03-10 citizen ID accepts 9 or 12 digits and blank", () => {
  assert.equal(check({ citizen_id: "123456789" }).citizen_id, undefined);
  assert.equal(check({ citizen_id: "001234567890" }).citizen_id, undefined);
  assert.equal(check({ citizen_id: " 123456789 " }).citizen_id, undefined);
  assert.equal(check({ citizen_id: "" }).citizen_id, undefined);
});

test("TC-US03-11 citizen ID rejects wrong length, letters and separators", () => {
  const message = "Citizen ID must be 9 or 12 digits, with no spaces, letters or separators.";
  for (const value of ["12345678", "1234567890", "1234567890123", "12345678a", "123 456 789", "123-456-789"]) {
    assert.equal(check({ citizen_id: value }).citizen_id, message, value);
  }
});

test("TC-US03-12 bank account accepts 6 to 20 digits, rejects 5 and 21", () => {
  const message = "Bank account must be 6 to 20 digits, with no spaces, letters or separators.";
  assert.equal(check({ bank_account: "123456" }).bank_account, undefined);
  assert.equal(check({ bank_account: "1".repeat(20) }).bank_account, undefined);
  assert.equal(check({ bank_account: "12345" }).bank_account, message);
  assert.equal(check({ bank_account: "1".repeat(21) }).bank_account, message);
  assert.equal(check({ bank_account: "1234 5678" }).bank_account, message);
});

test("TC-US03-13 identifier longer than 32 raw characters reports the length limit", () => {
  assert.equal(
    check({ bank_account: "1".repeat(33) }).bank_account,
    "Bank account must not exceed 32 characters.",
  );
  assert.equal(
    check({ citizen_id: "1".repeat(33) }).citizen_id,
    "Citizen ID must not exceed 32 characters.",
  );
});

test("TC-US03-14 non-ASCII digits are rejected in identifiers", () => {
  assert.equal(
    check({ citizen_id: "١٢٣٤٥٦٧٨٩" }).citizen_id,
    "Citizen ID must be 9 or 12 digits, with no spaces, letters or separators.",
  );
});

test("TC-US09-34 BR9 payment equal to loan is accepted, one above rejected", () => {
  const equal = { loan_amount: "1000", loan_term_months: "5", estimated_monthly_payment: "1000" };
  assert.deepEqual(check(equal), {});
  assert.equal(
    check({ ...equal, estimated_monthly_payment: "1001" }).estimated_monthly_payment,
    "Estimated monthly payment must not exceed the loan amount.",
  );
});

test("TC-US09-35 BR9 payment times term equal to loan accepted, one below rejected", () => {
  const base = { loan_amount: "1000", loan_term_months: "10", estimated_monthly_payment: "100" };
  assert.deepEqual(check(base), {});
  assert.equal(
    check({ ...base, loan_amount: "1001" }).estimated_monthly_payment,
    "Estimated monthly payment multiplied by the loan term must cover the loan amount.",
  );
});

test("TC-US09-36 BR9 is skipped when loan, term or payment is itself invalid", () => {
  const errors = check({ loan_amount: "abc", estimated_monthly_payment: "5" });
  assert.deepEqual(Object.keys(errors), ["loan_amount"]);
  const noTerm = check({ loan_term_months: "0", loan_amount: "1000", estimated_monthly_payment: "1" });
  assert.deepEqual(Object.keys(noTerm), ["loan_term_months"]);
});
