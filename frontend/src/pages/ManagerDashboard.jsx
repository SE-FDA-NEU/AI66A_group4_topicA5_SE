import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, isRetryable, vnd } from "../api";
import { canApprove, reviewQueue, reviewReason } from "../review";
import { RiskBadge, StatusBadge } from "../components/Badges";
import PageHeader from "../components/PageHeader";
import { formatDateTime } from "../format";
import { QUEUE_FILTER_TEXT } from "../glossary";
import { Empty, ErrorBox, Loading } from "../components/States";

export function ManagerView({ data, applications }) {
  const queue = reviewQueue(applications);
  const counts = {
    review: queue.length,
    "high-risk": queue.filter((a) => a.dsr_flag_high_risk).length,
    eligible: queue.filter(canApprove).length,
  };
  return <>
    <PageHeader title="Branch review overview"
      actions={<Link className="button primary" to="/loan-applications?view=review">Open review queue</Link>} />
    <nav className="chips" aria-label="Review filters">
      {Object.keys(counts).map((key) => <Link key={key} className="chip" to={`/loan-applications?view=${key}`}>
        {QUEUE_FILTER_TEXT[key]} <span className="count">{counts[key]}</span>
      </Link>)}
    </nav>
    <section className="review-section" aria-labelledby="queue-title">
      <h2 id="queue-title">Manager review queue</h2>
      {queue.length === 0 ? <Empty text="No applications awaiting manager review." /> : <>
        <div className="scroll"><table>
          <thead><tr><th>Application / Officer</th><th>Loan / score</th><th>Review reason</th><th /></tr></thead>
          <tbody>{queue.slice(0, 8).map((a) => <tr key={a.id}>
            <td><strong>#{a.id.slice(0, 8)}</strong><br />{a.owner_name}<br /><small>{formatDateTime(a.created_at)}</small></td>
            <td>{vnd(a.loan_amount)}<br />Score: {a.latest_score?.score ?? "Not available"}</td>
            <td className="wrap-cell"><StatusBadge status={a.status} /> <RiskBadge high={a.dsr_flag_high_risk} />
              {a.status === "pending" ? <p className="muted">{reviewReason(a)}</p> : <p>{reviewReason(a)}</p>}</td>
            <td><Link to={`/loan-applications/${a.id}`} state={{ from: "/dashboard" }}>Review application</Link></td>
          </tr>)}</tbody>
        </table></div>
        <p><Link to="/loan-applications?view=review">View the full review queue ({queue.length})</Link></p>
      </>}
    </section>
    <section aria-labelledby="today-title">
      <h2 id="today-title">Branch activity today <small>{data.date}</small></h2>
      <div className="tiles">
        <div className="card tile"><span className="num">{data.total_applications}</span>branch applications today</div>
        <div className="card tile"><span className="num">{data.average_score ?? "-"}</span>average score</div>
        <div className="card tile"><span className="num">{data.high_risk_count}</span>high risk today</div>
      </div>
      {data.total_applications === 0 && <p className="muted">0 applications today.</p>}
    </section>
    <p>Employee accounts: <Link to="/admin/users">Manage employees</Link></p>
  </>;
}

export default function ManagerDashboard() {
  const [state, setState] = useState({ status: "loading" });
  const load = useCallback(() => {
    let active = true;
    setState({ status: "loading" });
    Promise.all([api.summary(), api.listApplications()]).then(
      ([data, applications]) => { if (active) setState({ status: "ok", data, applications }); },
      (err) => { if (active) setState({ status: "error", message: err.message, retryable: isRetryable(err) }); }
    );
    return () => { active = false; };
  }, []);
  useEffect(load, [load]);

  const heading = <PageHeader title="Branch review overview"
    actions={<Link className="button primary" to="/loan-applications?view=review">Open review queue</Link>} />;
  if (state.status === "loading") return <>{heading}<Loading text="Loading branch overview and review queue..." /></>;
  if (state.status === "error") return <>{heading}<ErrorBox message={state.message} onRetry={state.retryable ? load : undefined} /></>;

  return <ManagerView data={state.data} applications={state.applications} />;
}
