import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, vnd } from "../api";
import { useAuth } from "../auth";
import { RiskBadge, StatusBadge } from "../components/Badges";
import { ErrorBox, Loading } from "../components/States";
import { canApprove as eligibleForApproval } from "../review";

function ScoreCard({ result, status }) {
  if (!result) return <p className="muted">This application has not been scored yet.</p>;
  if (result.score == null && result.rejected_reason === "score_out_of_range")
    return (
      <div className="alert">
        The model returned an invalid score, so no score is shown. A manager will review this application.
      </div>
    );
  const rejected = result.label === "rejected";
  return (
    <div className={`score ${result.label ?? ""}`}>
      <div className="big">{result.score ?? "-"}<small>{result.score != null && " / 100"}</small></div>
      <div>
        <strong>{rejected ? "Recommendation Rejected" : result.label_text}</strong>
        {status === "manual_review" && <p>Requires manager review.</p>}
        <h3>{rejected ? "Why it was rejected" : "Main factors"}</h3>
        <ul>{result.explanation.map((line) => <li key={line}>{line}</li>)}</ul>
      </div>
    </div>
  );
}

export default function ApplicationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const [state, setState] = useState({ status: "loading" });
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [confirmApproval, setConfirmApproval] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState("");
  const notice = location.state?.notice;

  const load = useCallback(() => {
    setState({ status: "loading" });
    api.getApplication(id).then(
      (app) => setState({ status: "ok", app }),
      (err) => setState({ status: "error", message: err.message })
    );
  }, [id]);
  useEffect(load, [load]);

  const rescore = async () => {
    setScoring(true);
    setScoreError("");
    try {
      const { application } = await api.score(id);
      setState({ status: "ok", app: application });
    } catch (err) {
      setScoreError(err.message);
      load(); // BR5 changes the status to manual_review, so show the fresh state
    } finally {
      setScoring(false);
    }
  };

  const approve = async () => {
    setApproving(true);
    setApprovalError("");
    try {
      const application = await api.approve(id);
      setState({ status: "ok", app: application });
      setConfirmApproval(false);
    } catch (err) {
      setApprovalError(err.message);
      setConfirmApproval(false);
      load();
    } finally {
      setApproving(false);
    }
  };

  if (state.status === "loading") return <Loading text="Loading the application..." />;
  if (state.status === "error")
    return (
      <>
        <ErrorBox message={state.message} onRetry={load} />
        <p><Link to="/loan-applications">Back to the list</Link></p>
      </>
    );

  const a = state.app;
  const canApprove = eligibleForApproval(a);
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
        <h2>Credit score</h2>
        <ScoreCard result={a.latest_score} status={a.status} />
        {scoreError && <div className="alert" role="alert">{scoreError}</div>}
        {!["cancelled", "approved"].includes(a.status) && (
          <button onClick={rescore} disabled={scoring || approving || confirmApproval}>{scoring ? "Scoring..." : a.latest_score ? "Score again" : "Get credit score"}</button>
        )}
      </section>

      <section className={`card ${user.role === "admin" ? "manager-decision" : ""}`}>
        <h2>{user.role === "admin" ? "Your approval decision" : "Manager decision"}</h2>
        {approvalError && <div className="alert" role="alert">{approvalError}</div>}
        {a.status === "approved" ? (
          <div role="status">
            <strong>Approved</strong>
            {a.approval && <p>Approved by {a.approval.actor_name} on {new Date(a.approval.approved_at).toLocaleString()}.</p>}
            <p>This records the manager's approval of the application. Disbursement is handled outside this app.</p>
          </div>
        ) : ["cancelled", "rejected"].includes(a.status) ? (
          <p>This application is {a.status} and cannot be approved.</p>
        ) : (
          <>
            <p>The score is a recommendation. A manager makes the approval decision after reviewing the application data and reasons.</p>
            {user.role !== "admin" ? (
              <p>Ask your branch manager to open this application from Applications and review it.</p>
            ) : !canApprove ? (
              <p>Approval requires a valid latest score of at least 70 (Eligible for proposal). Review the data and scoring results first.</p>
            ) : confirmApproval ? (
              <div className="alert warn" role="group" aria-label="Confirm manager approval">
                <p>Confirm you have reviewed the application data, score and reasons{a.dsr_flag_high_risk ? ", including the High risk warning" : ""}.</p>
                <button className="primary" onClick={approve} disabled={approving || scoring}>{approving ? "Approving..." : "Confirm approval"}</button>{" "}
                <button onClick={() => setConfirmApproval(false)} disabled={approving}>Keep reviewing</button>
              </div>
            ) : (
              <button className="primary" onClick={() => { setApprovalError(""); setConfirmApproval(true); }} disabled={scoring || approving}>Approve application</button>
            )}
          </>
        )}
      </section>

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
