import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, isRetryable, vnd } from "../api";
import { useAuth } from "../auth";
import { StatusBadge } from "../components/Badges";
import Card from "../components/Card";
import DataList from "../components/DataList";
import PageHeader from "../components/PageHeader";
import ScoreCard from "../components/ScoreCard";
import ScoreHistory from "../components/ScoreHistory";
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
  const [tab, setTab] = useState("details");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyRetryable, setHistoryRetryable] = useState(false);
  const historyVersion = useRef(0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const notice = location.state?.notice;
  useEffect(() => {
    activeId.current = id;
    setTab("details");
    setConfirmCancel(false);
    setCancelling(false);
    setCancelError("");
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

  const cancel = async () => {
    setCancelling(true);
    setCancelError("");
    try {
      const application = await api.cancelApplication(id);
      if (activeId.current !== id) return;
      setState({ status: "ok", app: application });
      setConfirmCancel(false);
      window.dispatchEvent(new Event("notifications-changed"));
    } catch (err) {
      if (activeId.current === id) { setCancelError(err.message); setConfirmCancel(false); load(); }
    } finally { if (activeId.current === id) setCancelling(false); }
  };

  const tabKey = event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "details" : event.key === "End" ? "history" : tab === "details" ? "history" : "details";
    setTab(next);
    document.getElementById(`${next}-tab`)?.focus();
  };

  const from = location.state?.from;
  const backTarget = typeof from === "string" && (from === "/dashboard" || from.startsWith("/loan-applications")) ? from : "/loan-applications";
  const backLabel = backTarget === "/dashboard" ? "Back to the dashboard" : "Back to the list";

  if (state.status === "loading") return <Loading text="Loading the application..." />;
  if (state.status === "error")
    return (
      <>
        <ErrorBox message={state.message} onRetry={state.retryable ? load : undefined} />
        <p><Link to={backTarget}>{backLabel}</Link></p>
      </>
    );

  const a = state.app;
  const canApprove = eligibleForApproval(a);
  const manager = user.role === "admin";
  const editable = a.status === "pending" && !a.latest_score;
  return (
    <>
      <p><Link to={backTarget}>{backLabel}</Link></p>
      <PageHeader
        title={`Application #${a.id.slice(0, 8)}`}
        badge={<StatusBadge status={a.status} />}
        actions={editable && !confirmCancel ? <>
          <button onClick={() => navigate(`/loan-applications/${id}/edit`)} disabled={scoring || cancelling}>Edit application</button>
          <button onClick={() => setConfirmCancel(true)} disabled={cancelling}>Cancel application</button>
        </> : undefined}
      />
      <p className="detail-meta muted">Created by {a.owner_name} · {formatDateTime(a.created_at)}</p>
      {notice && <div className="alert" role="alert">{notice}</div>}
      {a.dsr_flag_high_risk && (
        <div className="alert warn" role="alert">
          <strong>High risk.</strong> The installment is {a.dsr_percent}% of monthly income, above the 50% limit.{" "}
          {a.status === "approved" ? "A manager has reviewed and approved this application." : "A manager must review it even if the score is good."}
        </div>
      )}
      {editable && confirmCancel && (
        <div className="alert warn" role="group" aria-label="Confirm application cancellation">
          <p>Cancel this application? Its record is retained, and it will leave the pending review queue.</p>
          <button onClick={cancel} disabled={cancelling}>{cancelling ? "Cancelling..." : "Confirm cancellation"}</button>{" "}
          <button onClick={() => setConfirmCancel(false)} disabled={cancelling}>Keep application</button>
        </div>
      )}
      {cancelError && <div className="alert" role="alert">{cancelError}</div>}

      <div className="detail-grid">
        <aside className="detail-side">
          <Card title="Credit score">
            <ScoreCard result={a.latest_score} status={a.status} showModelVersion={manager} />
            {scoreError && <div className="alert" role="alert">{scoreError}</div>}
            {!["cancelled", "approved"].includes(a.status) && (
              <button onClick={rescore} disabled={scoring || approving || confirmApproval}>{scoring ? "Scoring..." : a.latest_score ? "Score again" : "Get credit score"}</button>
            )}
          </Card>
          <Card title={manager ? "Your approval decision" : "Manager decision"} className={manager ? "manager-decision" : undefined}>
            {approvalError && <div className="alert" role="alert">{approvalError}</div>}
            {a.status === "approved" ? (
              <div role="status">
                <strong>Approved</strong>
                {a.approval && <p>Approved by {a.approval.actor_name} on {formatDateTime(a.approval.approved_at)}.</p>}
                <p>This records the manager's approval of the application. Disbursement is handled outside this app.</p>
              </div>
            ) : ["cancelled", "rejected"].includes(a.status) ? (
              <p>This application is {a.status} and cannot be approved.</p>
            ) : !manager ? (
              <p>{a.latest_score ? "Waiting for the branch manager's decision." : "The branch manager can decide once the application is scored."}</p>
            ) : !canApprove ? (
              <p>Approval needs a latest score of 70 or more (Eligible for proposal).</p>
            ) : confirmApproval ? (
              <div className="alert warn" role="group" aria-label="Confirm manager approval">
                <p>Confirm you have reviewed the application data, score and reasons{a.dsr_flag_high_risk ? ", including the High risk warning" : ""}.</p>
                <button className="primary" onClick={approve} disabled={approving || scoring}>{approving ? "Approving..." : "Confirm approval"}</button>{" "}
                <button onClick={() => setConfirmApproval(false)} disabled={approving}>Keep reviewing</button>
              </div>
            ) : (
              <button className="primary" onClick={() => { setApprovalError(""); setConfirmApproval(true); }} disabled={scoring || approving}>Approve application</button>
            )}
          </Card>
        </aside>

        <div className="detail-main">
          <div role="tablist" aria-label="Application views" className="application-tabs" onKeyDown={tabKey}>
            <button id="details-tab" role="tab" aria-selected={tab === "details"} aria-controls="details-panel" tabIndex={tab === "details" ? 0 : -1} onClick={() => setTab("details")}>Application details</button>
            <button id="history-tab" role="tab" aria-selected={tab === "history"} aria-controls="history-panel" tabIndex={tab === "history" ? 0 : -1} onClick={() => setTab("history")}>Scoring history</button>
          </div>
          <div role="tabpanel" id="details-panel" aria-labelledby="details-tab" hidden={tab !== "details"}>
            <Card title="Application data">
              <DataList rows={[
                ["Monthly income", vnd(a.monthly_income)],
                ["Loan amount", vnd(a.loan_amount)],
                ["Loan term", `${a.loan_term_months} months`],
                ["Estimated monthly payment", `${vnd(a.estimated_monthly_payment)} (${a.dsr_percent}% of income)`],
                ["Purpose", a.purpose || null],
                ["Credit history", a.credit_history_note || null],
                ["CIC debt group", a.cic_debt_group ?? "Not available"],
              ]} />
            </Card>
            <SensitiveData key={a.id} application={a} />
          </div>
          <section role="tabpanel" id="history-panel" aria-labelledby="history-tab" hidden={tab !== "history"} className="card">
            <h2>Scoring history</h2>
            {historyLoading ? <Loading text="Loading score history..." /> : historyError
              ? <ErrorBox message={`Score history could not be loaded. ${historyError}`} onRetry={historyRetryable ? loadHistory : undefined} />
              : <ScoreHistory history={history} />}
          </section>
        </div>
      </div>
    </>
  );
}
