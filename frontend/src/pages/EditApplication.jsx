import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, isRetryable } from "../api";
import { ErrorBox, Loading } from "../components/States";
import { validateApplication } from "../validation";

const FIELDS = [
  ["monthly_income", "Monthly income (VND)"], ["loan_amount", "Loan amount (VND)"],
  ["loan_term_months", "Loan term (months)"], ["estimated_monthly_payment", "Estimated monthly payment (VND)"],
  ["purpose", "Loan purpose"], ["credit_history_note", "Credit history"], ["cic_debt_group", "CIC debt group (1-5, optional)"],
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
        setForm(Object.fromEntries(FIELDS.map(([name]) => [name, String(loan[name] ?? "")])));
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
      document.getElementById(`edit-${Object.keys(problems)[0]}`)?.focus();
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
    <h1>Edit application</h1><div className="alert" role="alert">Application already processed, cannot be edited</div>
    <Link to={`/loan-applications/${id}`}>Back to application</Link>
  </>;
  return <>
    <h1>Edit application</h1>
    <p>Only an unprocessed application can be edited. Its High risk flag is recalculated when you save.</p>
    <form className="card form" onSubmit={submit} noValidate>
      {message && <div className="alert" role="alert">{message}</div>}
      {FIELDS.map(([name, label]) => <div className={errors[name] ? "field has-error" : "field"} key={name}>
        <label htmlFor={`edit-${name}`}>{label}</label>
        <input id={`edit-${name}`} value={form[name]} onChange={event => setForm({ ...form, [name]: event.target.value })}
          aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `edit-${name}-error` : undefined} />
        {errors[name] && <small id={`edit-${name}-error`} className="field-error">{errors[name]}</small>}
      </div>)}
      <p className="muted">Protected identifiers stay unchanged by this form.</p>
      <button type="submit" className="primary" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button>{" "}
      <Link to={`/loan-applications/${id}`}>Keep existing data</Link>
    </form>
  </>;
}
