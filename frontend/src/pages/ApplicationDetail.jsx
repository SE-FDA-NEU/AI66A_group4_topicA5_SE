import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, isRetryable, vnd } from "../api";
import { useAuth } from "../auth";
import { RiskBadge, StatusBadge } from "../components/Badges";
import ScoreCard from "../components/ScoreCard";
import { ErrorBox, Loading } from "../components/States";
import { formatDateTime } from "../format";
import SensitiveData from "../components/SensitiveData";
import { canApprove as eligibleForApproval } from "../review";

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const activeId = useRef(id);
  const loadVersion = useRef(0);
  const automaticScores = useRef(new Set());
  const { user } = useAuth();
  const location = useLocation();
  const [state, setState] = useState({ status: "loading" });
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [confirmApproval, setConfirmApproval] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyRetryable, setHistoryRetryable] = useState(false);
  const historyVersion = useRef(0);
  useEffect(() => {
    activeId.current = id;
    setHistory([]);
    setHistoryError("");
    setScoring(false);
    setScoreError("");
    setConfirmApproval(false);
    setApproving(false);
    setApprovalError("");
    return () => { activeId.current = null; };
  }, [id]);

  const load = useCallback(() => {
    const version = ++loadVersion.current;
    setState({ status: "loading" });
    const current = () => activeId.current === id && loadVersion.current === version;
    api.getApplication(id).then(
      (app) => { if (current()) setState({ status: "ok", app }); },
      (err) => { if (current()) setState({ status: "error", message: err.message, retryable: isRetryable(err) }); }
    );
    return () => { loadVersion.current++; };
  }, [id]);
  useEffect(load, [load]);

  const loadHistory = useCallback(() => {
    const version = ++historyVersion.current;
    const current = () => activeId.current === id && historyVersion.current === version;
    setHistoryLoading(true);
    return api.scoreHistory(id).then(
      list => { if (current()) { setHistory(list); setHistoryError(""); } },
      err => { if (current()) { setHistoryError(err.message); setHistoryRetryable(isRetryable(err)); } }
    ).finally(() => { if (current()) setHistoryLoading(false); });
  }, [id]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const rescore = useCallback(async () => {
    setScoring(true);
    setScoreError("");
    try {
      const { application } = await api.score(id);
      if (activeId.current !== id) return;
      setState({ status: "ok", app: application });
    } catch (err) {
      if (activeId.current !== id) return;
      setScoreError(err.message);
      load(); // BR5 changes the status to manual_review, so show the fresh state
    } finally {
      if (activeId.current === id) {
        await loadHistory();
        setScoring(false);
      }
    }
  }, [id, load, loadHistory]);

  useEffect(() => {
    if (!location.state?.scoreOnOpen || state.status !== "ok" || state.app.id !== id
        || automaticScores.current.has(id)) return;
    // Consume the request in browser history and guard StrictMode's repeated effect.
    automaticScores.current.add(id);
    navigate(location.pathname, { replace: true, state: { ...location.state, scoreOnOpen: false } });
    void rescore();
  }, [id, location.pathname, location.state, navigate, rescore, state]);

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
        <ErrorBox message={state.message} onRetry={state.retryable ? load : undefined} />
        <p><Link to="/loan-applications">Back to the list</Link></p>
      </>
    );

  const a = state.app;
  const canApprove = eligibleForApproval(a);
  const manager = user.role === "admin";
  return (
    <>
      <p className="eyebrow">{manager ? "Manager · Application review" : "Officer · My application"}</p>
      <h1>Application <small className="muted">#{a.id.slice(0, 8)}</small> <StatusBadge status={a.status} /></h1>
      <p className="muted">{manager
        ? `Created by ${a.owner_name}. Review the data, score and risk warnings before making an approval decision below.`
        : "You can check the data and scoring reasons here. Your branch manager makes the approval decision."}</p>
      {manager && <p><Link to="/loan-applications?view=review">Back to manager review queue</Link></p>}
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

      <section className={`card ${manager ? "manager-decision" : ""}`}>
        <h2>{manager ? "Your approval decision" : "Manager decision"}</h2>
        {approvalError && <div className="alert" role="alert">{approvalError}</div>}
        {a.status === "approved" ? (
          <div role="status">
            <strong>Approved</strong>
            {a.approval && <p>Approved by {a.approval.actor_name} on {formatDateTime(a.approval.approved_at)}.</p>}
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
      <SensitiveData key={a.id} application={a} />
      <p><Link to="/loan-applications">Back to the list</Link></p>
    </>
  );
}