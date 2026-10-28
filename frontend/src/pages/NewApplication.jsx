import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { validateApplication } from "../validation";

const FIELD_ORDER = [
  "monthly_income", "loan_amount", "loan_term_months", "estimated_monthly_payment",
  "citizen_id", "bank_account", "purpose", "credit_history_note", "cic_debt_group",
];
const fieldId = (name) => `field-${name}`;

function focusFirstInvalid(errors) {
  const first = FIELD_ORDER.find((name) => errors[name]);
  if (first) document.getElementById(fieldId(first))?.focus();
}

const EMPTY = {
  monthly_income: "", loan_amount: "", loan_term_months: "", estimated_monthly_payment: "",
  purpose: "", credit_history_note: "", cic_debt_group: "", citizen_id: "", bank_account: "",
};

function Field({ name, label, hint, form, setForm, errors, area }) {
  const Tag = area ? "textarea" : "input";
  const props = area ? { rows: 2 } : { type: "text", inputMode: name === "purpose" ? "text" : "numeric" };
  const id = fieldId(name);
  const error = errors[name];
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className={error ? "field has-error" : "field"}>
      <label htmlFor={id}>{label}</label>
      <Tag
        {...props}
        id={id}
        value={form[name]}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      />
      {hint && <small id={`${id}-hint`} className="muted">{hint}</small>}
      {error && <small id={`${id}-error`} className="field-error">{error}</small>}
    </div>
  );
}

export default function NewApplication() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    const problems = validateApplication(form);
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      setMessage("Please correct the highlighted fields and submit again.");
      focusFirstInvalid(problems);
      return;
    }
    setErrors({});
    setBusy("Saving the application...");
    let created;
    try {
      const payload = {
        monthly_income: form.monthly_income,
        loan_amount: form.loan_amount,
        loan_term_months: form.loan_term_months,
        estimated_monthly_payment: form.estimated_monthly_payment,
        purpose: form.purpose,
        credit_history_note: form.credit_history_note,
        cic_debt_group: form.cic_debt_group.trim() === "" ? null : form.cic_debt_group,
        // BR7: sent as text so leading zeros survive; the server encrypts them
        // before the insert and returns only the masked form.
        citizen_id: form.citizen_id.trim() === "" ? null : form.citizen_id.trim(),
        bank_account: form.bank_account.trim() === "" ? null : form.bank_account.trim(),
      };
      created = await api.createApplication(payload);
    } catch (err) {
      const fields = err.fields || {};
      setErrors(fields);
      focusFirstInvalid(fields);
      setMessage(err.message);
      setBusy("");
      return;
    }
    setForm((current) => ({ ...current, citizen_id: "", bank_account: "" }));
    // US03: submit for automated scoring right away. If scoring fails the application is still saved.
    setBusy("Scoring the application...");
    let notice = "";
    try {
      await api.score(created.id);
    } catch (err) {
      notice = `The application was saved, but it could not be scored yet: ${err.message}`;
    }
    navigate(`/loan-applications/${created.id}`, { state: { notice } });
  };

  const f = { form, setForm, errors };
  const errorList = Object.entries(errors);
  const showList = errorList.length > 1 || errorList.some(([name]) => name === "form");
  return (
    <>
      <h1>New loan application</h1>
      <form className="card form" onSubmit={submit} noValidate>
        {message && (
          <div className="alert" role="alert">
            <strong>{showList ? "Please fix these fields:" : message}</strong>
            {showList && <ul>{errorList.map(([name, m]) => <li key={name}>{m}</li>)}</ul>}
          </div>
        )}
        <Field {...f} name="monthly_income" label="Monthly income (VND)" hint="e.g. 20000000" />
        <Field {...f} name="loan_amount" label="Loan amount (VND)" />
        <Field {...f} name="loan_term_months" label="Loan term (months)" />
        <Field {...f} name="estimated_monthly_payment" label="Estimated monthly payment (VND)" hint="If this is more than half of income, the application is flagged High risk." />
        <Field {...f} name="citizen_id" label="Citizen ID (optional)" hint="9 or 12 digits. Stored encrypted; only the last 4 digits are normally shown." />
        <Field {...f} name="bank_account" label="Bank account (optional)" hint="6 to 20 digits. Stored encrypted; access to the full number is logged." />
        <Field {...f} name="purpose" label="Loan purpose" />
        <Field {...f} name="credit_history_note" label="Credit history" area />
        <Field {...f} name="cic_debt_group" label="CIC debt group (1-5, optional)" />
        <button type="submit" className="primary" disabled={!!busy}>{busy || "Submit and score"}</button>
      </form>
    </>
  );
}
