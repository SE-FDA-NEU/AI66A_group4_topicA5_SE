import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import ApplicationFields, { FIELD_ORDER } from "../components/ApplicationFields";
import ErrorSummary from "../components/ErrorSummary";
import PageHeader from "../components/PageHeader";
import { ACTION_TEXT } from "../glossary";
import { validateApplication } from "../validation";

const fieldId = (name) => `field-${name}`;

function focusFirstInvalid(errors) {
  const first = FIELD_ORDER.find((name) => errors[name]);
  if (first) document.getElementById(fieldId(first))?.focus();
}

const EMPTY = {
  monthly_income: "", loan_amount: "", loan_term_months: "", estimated_monthly_payment: "",
  purpose: "", credit_history_note: "", cic_debt_group: "", citizen_id: "", bank_account: "",
};

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
    // Open the persisted record immediately, then score from Details. A slow or
    // failed score must not hide the saved state or the pre-scoring High risk flag.
    navigate(`/loan-applications/${created.id}`, { state: { scoreOnOpen: true } });
  };

  return (
    <>
      <PageHeader title="New loan application" />
      <form className="form-grid" onSubmit={submit} noValidate>
        <ErrorSummary errors={errors} idPrefix="field-" message={message} fields={FIELD_ORDER} />
        <ApplicationFields form={form} setForm={setForm} errors={errors} idPrefix="field-" showIdentifiers />
        <div className="form-actions">
          <button type="submit" className="primary" disabled={!!busy}>{busy || ACTION_TEXT.submitAndScore}</button>
        </div>
      </form>
    </>
  );
}
