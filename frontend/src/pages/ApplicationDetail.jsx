import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, vnd } from "../api";
import { RiskBadge, StatusBadge } from "../components/Badges";
import { ErrorBox, Loading } from "../components/States";

export default function ApplicationDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [state, setState] = useState({ status: "loading" });
  const notice = location.state?.notice;

  const load = useCallback(() => {
    setState({ status: "loading" });
    api.getApplication(id).then(
      (app) => setState({ status: "ok", app }),
      (err) => setState({ status: "error", message: err.message })
    );
  }, [id]);
  useEffect(load, [load]);

  if (state.status === "loading") return <Loading text="Loading the application..." />;
  if (state.status === "error")
    return (
      <>
        <ErrorBox message={state.message} onRetry={load} />
        <p><Link to="/loan-applications">Back to the list</Link></p>
      </>
    );

  const a = state.app;
  return (
    <>
      <h1>Application <small className="muted">#{a.id.slice(0, 8)}</small> <StatusBadge status={a.status} /></h1>
      {notice && <div className="alert" role="alert">{notice}</div>}
      {a.dsr_flag_high_risk && (
        <div className="alert warn" role="alert">
          <strong>High risk.</strong> The installment is {a.dsr_percent}% of monthly income, above the 50% limit.
          {a.status === "approved" ? "A manager has reviewed and approved this application." : "A manager must review it even if the score is good."}
        </div>
      )}

      <section className="card">
        <h2>Application data <RiskBadge high={a.dsr_flag_high_risk} /></h2>
        <dl>
          <dt>Created by</dt><dd>{a.owner_name}</dd>
          <dt>Monthly income</dt><dd>{vnd(a.monthly_income)}</dd>
          <dt>Loan amount</dt><dd>{vnd(a.loan_amount)}</dd>
          <dt>Loan term</dt><dd>{a.loan_term_months} months</dd>
          <dt>Estimated monthly payment</dt><dd>{vnd(a.estimated_monthly_payment)} ({a.dsr_percent}% of income)</dd>
          <dt>Purpose</dt><dd>{a.purpose || "-"}</dd>
          <dt>Credit history</dt><dd>{a.credit_history_note || "-"}</dd>
          <dt>CIC debt group</dt><dd>{a.cic_debt_group ?? "Not available"}</dd>
        </dl>
      </section>
      <p><Link to="/loan-applications">Back to the list</Link></p>
    </>
  );
}
