import { useRef } from "react";
import Field from "./Field";
import { CIC_OPTIONS, dsrInfo, suggestPayment } from "../dsr";

// Visual order, so focusing the first invalid field lands on the first visible one.
export const FIELD_ORDER = [
  "application_name", "loan_amount", "loan_term_months", "estimated_monthly_payment", "purpose",
  "monthly_income", "credit_history_note", "cic_debt_group", "citizen_id", "bank_account",
];

// Fields the Edit form renders (it omits the protected identifiers).
export const EDIT_FIELD_ORDER = FIELD_ORDER.filter((name) => name !== "citizen_id" && name !== "bank_account");

const REQUIRED = ["application_name", "monthly_income", "loan_amount", "loan_term_months", "estimated_monthly_payment"];
const HINTS = {
  monthly_income: "e.g. 20000000",
  estimated_monthly_payment: "Filled in from loan amount and term; you can change it.",
  citizen_id: "9 or 12 digits. Stored encrypted; only the last 4 digits are normally shown.",
  bank_account: "6 to 20 digits. Stored encrypted; access to the full number is logged.",
};

export default function ApplicationFields({ form, setForm, errors, idPrefix, showIdentifiers }) {
  // Auto-fill the payment from loan amount and term until the user types their own value
  // (or the form opened with one already saved, as in Edit).
  const paymentTyped = useRef(String(form.estimated_monthly_payment ?? "").trim() !== "");
  const change = (name, value) => {
    const next = { ...form, [name]: value };
    if (name === "estimated_monthly_payment") paymentTyped.current = value.trim() !== "";
    else if ((name === "loan_amount" || name === "loan_term_months") && !paymentTyped.current) {
      next.estimated_monthly_payment = suggestPayment(next.loan_amount, next.loan_term_months);
    }
    setForm(next);
  };
  const control = (name, { area, select, numeric = true } = {}) => {
    const id = `${idPrefix}${name}`;
    const error = errors[name];
    const describedBy = [HINTS[name] && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
    const props = {
      id,
      value: form[name] ?? "",
      "aria-required": REQUIRED.includes(name) ? "true" : undefined,
      "aria-invalid": error ? "true" : undefined,
      "aria-describedby": describedBy || undefined,
      onChange: (event) => change(name, event.target.value),
    };
    if (select) {
      return (
        <select {...props}>
          {CIC_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      );
    }
    if (area) return <textarea {...props} rows={2} />;
    return <input {...props} type="text" inputMode={numeric ? "numeric" : "text"} />;
  };
  const field = (name, label, options = {}) => (
    <Field id={`${idPrefix}${name}`} label={label} required={REQUIRED.includes(name)} hint={HINTS[name]} error={errors[name]} announce={false} wide={options.wide}>
      {control(name, options)}
      {options.after}
    </Field>
  );
  const dsr = dsrInfo(form.monthly_income, form.estimated_monthly_payment);
  const dsrLine = (
    <p className={`dsr-line${dsr?.high ? " warn" : ""}`} aria-live="polite">
      {dsr && `Installment is ${dsr.percent}% of income${dsr.high ? " (above the 50% limit)" : ""}`}
    </p>
  );
  return (
    <>
      <fieldset className="form-group">
        <legend>Loan</legend>
        {field("application_name", "Application name", { numeric: false, wide: true })}
        {field("loan_amount", "Loan amount (VND)")}
        {field("loan_term_months", "Loan term (months)")}
        {field("estimated_monthly_payment", "Estimated monthly payment (VND)", { after: dsrLine })}
        {field("purpose", "Loan purpose", { numeric: false })}
      </fieldset>
      <fieldset className="form-group">
        <legend>Customer finances</legend>
        {field("monthly_income", "Monthly income (VND)")}
        {field("credit_history_note", "Credit history", { area: true })}
        {field("cic_debt_group", "CIC debt group", { select: true })}
      </fieldset>
      {showIdentifiers && (
        <fieldset className="form-group">
          <legend>Protected identifiers (optional)</legend>
          {field("citizen_id", "Citizen ID")}
          {field("bank_account", "Bank account")}
        </fieldset>
      )}
    </>
  );
}
