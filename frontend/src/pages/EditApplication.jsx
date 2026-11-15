import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, isRetryable } from "../api";
import { ErrorBox, Loading } from "../components/States";
import ApplicationFields, { FIELD_ORDER } from "../components/ApplicationFields";
import ErrorSummary from "../components/ErrorSummary";
import PageHeader from "../components/PageHeader";
import { validateApplication } from "../validation";

const FIELDS = [
  "monthly_income", "loan_amount", "loan_term_months", "estimated_monthly_payment",
  "purpose", "credit_history_note", "cic_debt_group",
];

export default function EditApplication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "loading" });
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    api.getApplication(id).then(
      loan => {
        if (!active) return;
        setForm(Object.fromEntries(FIELDS.map(name => [name, String(loan[name] ?? "")])));
        setState({ status: "ok", loan });
      },
      err => { if (active) setState({ status: "error", message: err.message, retryable: isRetryable(err) }); }
    );
    return () => { active = false; };
  }, [id, attempt]);

  const submit = async event => {
    event.preventDefault();
    const problems = validateApplication(form);
    setErrors(problems);
    setMessage("");
    if (Object.keys(problems).length) {
      const first = FIELD_ORDER.find(name => problems[name]);
      document.getElementById(`edit-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      // Protected identifiers are intentionally omitted, so editing income or
      // notes cannot accidentally clear existing encrypted identifiers.
      await api.editApplication(id, form);
      navigate(`/loan-applications/${id}`, { replace: true, state: { notice: "Application updated. Review the saved data before scoring." } });
    } catch (err) {
      setErrors(err.fields || {});
      setMessage(err.message);
      setBusy(false);
    }
  };
  if (state.status === "loading") return <Loading text="Loading the saved application..." />;
  if (state.status === "error") return <ErrorBox message={state.message} onRetry={state.retryable ? () => setAttempt(v => v + 1) : undefined} />;
  if (state.loan.status !== "pending" || state.loan.latest_score) return <>
    <PageHeader title="Edit application" /><div className="alert" role="alert">Application already processed, cannot be edited</div>
    <Link to={`/loan-applications/${id}`}>Back to application</Link>
  </>;
  return <>
    <PageHeader title="Edit application" />
    <form className="form-grid" onSubmit={submit} noValidate>
      <ErrorSummary errors={errors} idPrefix="edit-" message={message} />
      <ApplicationFields form={form} setForm={setForm} errors={errors} idPrefix="edit-" showIdentifiers={false} />
      <p className="muted form-note">Protected identifiers stay unchanged by this form.</p>
      <div className="form-actions">
        <button type="submit" className="primary" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button>
        <Link to={`/loan-applications/${id}`}>Keep existing data</Link>
      </div>
    </form>
  </>;
}
