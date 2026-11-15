import Field from "./Field";
import { CIC_OPTIONS, dsrInfo } from "../dsr";

// Visual order, so focusing the first invalid field lands on the first visible one.
export const FIELD_ORDER = [
  "loan_amount", "loan_term_months", "estimated_monthly_payment", "purpose",
  "monthly_income", "credit_history_note", "cic_debt_group", "citizen_id", "bank_account",
];

const REQUIRED = ["monthly_income", "loan_amount", "loan_term_months", "estimated_monthly_payment"];
const HINTS = {
  monthly_income: "e.g. 20000000",
  citizen_id: "9 or 12 digits. Stored encrypted; only the last 4 digits are normally shown.",
  bank_account: "6 to 20 digits. Stored encrypted; access to the full number is logged.",
};

export default function ApplicationFields({ form, setForm, errors, idPrefix, showIdentifiers }) {
  const control = (name, { area, select, numeric = true } = {}) => {
    const id = `${idPrefix}${name}`;
    const error = errors[name];
    const describedBy = [HINTS[name] && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
    const props = {
      id,
      value: form[name] ?? "",
      "aria-invalid": error ? "true" : undefined,
      "aria-describedby": describedBy || undefined,
      onChange: (event) => setForm({ ...form, [name]: event.target.value }),
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
    <Field id={`${idPrefix}${name}`} label={label} required={REQUIRED.includes(name)} hint={HINTS[name]} error={errors[name]}>
      {control(name, options)}
      {options.after}
    </Field>
  );
  const dsr = dsrInfo(form.monthly_income, form.estimated_monthly_payment);
  const dsrLine = dsr && (
    <p className={`dsr-line${dsr.high ? " warn" : ""}`} aria-live="polite">
      Installment is {dsr.percent}% of income{dsr.high ? " (above the 50% limit)" : ""}
    </p>
  );
  return (
    <>
      <fieldset className="form-group">
        <legend>Loan</legend>
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
