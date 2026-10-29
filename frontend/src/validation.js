// Client-side mirror of the API rules (backend/app/routers/applications.py,
// main.py 422 handler and privacy.py). Messages must stay identical to the server's.

export const FIELD_LABELS = {
  monthly_income: "Monthly income",
  loan_amount: "Loan amount",
  loan_term_months: "Loan term",
  estimated_monthly_payment: "Estimated monthly payment",
  purpose: "Loan purpose",
  credit_history_note: "Credit history",
  cic_debt_group: "CIC debt group",
  citizen_id: "Citizen ID",
  bank_account: "Bank account",
};

const MAX_MONEY = 10n ** 13n;
const MAX_TERM = 600n;
const MAX_TEXT = 500;
const MAX_IDENTIFIER_INPUT = 32; // the API caps the raw (untrimmed) text first
const WHOLE_NUMBER = /^-?[0-9]+$/;

const MONEY_FIELDS = ["monthly_income", "loan_amount", "estimated_monthly_payment"];

const IDENTIFIER_RULES = {
  citizen_id: {
    ok: (n) => n === 9 || n === 12,
    message: "Citizen ID must be 9 or 12 digits, with no spaces, letters or separators.",
  },
  bank_account: {
    ok: (n) => n >= 6 && n <= 20,
    message: "Bank account must be 6 to 20 digits, with no spaces, letters or separators.",
  },
};

const text = (value) => (typeof value === "string" ? value : value == null ? "" : String(value));

// Returns a message for a required whole number, or { value } (BigInt) when it parses.
function parseRequired(form, name) {
  const label = FIELD_LABELS[name];
  const raw = text(form[name]).trim();
  if (raw === "") {
    return { error: name === "monthly_income" ? "Income is required" : `${label} is required.` };
  }
  if (!WHOLE_NUMBER.test(raw)) return { error: `${label} must be a whole number.` };
  return { value: BigInt(raw) };
}

function checkPositive(name, value, max) {
  const label = FIELD_LABELS[name];
  if (value <= 0n) {
    return `${label} must be greater than 0${name === "monthly_income" ? " VND" : ""}.`;
  }
  if (value > max) return `${label} must not exceed ${max}.`;
  return null;
}

export function validateApplication(form) {
  const errors = {};
  const numbers = {};

  for (const name of [...MONEY_FIELDS, "loan_term_months"]) {
    const parsed = parseRequired(form, name);
    if (parsed.error) {
      errors[name] = parsed.error;
      continue;
    }
    const max = name === "loan_term_months" ? MAX_TERM : MAX_MONEY;
    const problem = checkPositive(name, parsed.value, max);
    if (problem) errors[name] = problem;
    else numbers[name] = parsed.value;
  }

  const cic = text(form.cic_debt_group).trim();
  if (cic !== "") {
    if (!WHOLE_NUMBER.test(cic)) {
      errors.cic_debt_group = "CIC debt group must be a whole number.";
    } else {
      const value = BigInt(cic);
      if (value < 1n) errors.cic_debt_group = "CIC debt group must be at least 1.";
      else if (value > 5n) errors.cic_debt_group = "CIC debt group must not exceed 5.";
    }
  }

  for (const name of ["purpose", "credit_history_note"]) {
    if (text(form[name]).trim().length > MAX_TEXT) {
      errors[name] = `${FIELD_LABELS[name]} must not exceed ${MAX_TEXT} characters.`;
    }
  }

  for (const [name, rule] of Object.entries(IDENTIFIER_RULES)) {
    const raw = text(form[name]);
    if (raw.length > MAX_IDENTIFIER_INPUT) {
      errors[name] = `${FIELD_LABELS[name]} must not exceed ${MAX_IDENTIFIER_INPUT} characters.`;
      continue;
    }
    const cleaned = raw.trim();
    if (cleaned === "") continue;
    if (!/^[0-9]+$/.test(cleaned) || !rule.ok(cleaned.length)) errors[name] = rule.message;
  }

  // BR9: only when loan, term and payment are each valid on their own.
  const { loan_amount: loan, loan_term_months: term, estimated_monthly_payment: payment } = numbers;
  if (loan !== undefined && term !== undefined && payment !== undefined) {
    if (payment > loan) {
      errors.estimated_monthly_payment = "Estimated monthly payment must not exceed the loan amount.";
    } else if (payment * term < loan) {
      errors.estimated_monthly_payment =
        "Estimated monthly payment multiplied by the loan term must cover the loan amount.";
    }
  }

  return errors;
}
