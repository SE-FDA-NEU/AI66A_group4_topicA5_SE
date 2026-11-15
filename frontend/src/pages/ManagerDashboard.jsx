import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, isRetryable, vnd } from "../api";
import { canApprove, reviewQueue, reviewReason } from "../review";
import { RiskBadge, StatusBadge } from "../components/Badges";
import PageHeader from "../components/PageHeader";
import { formatDateTime } from "../format";
import { Empty, ErrorBox, Loading } from "../components/States";

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

  const { data } = state;
  const queue = reviewQueue(state.applications);
  return <>
    {heading}
    <section aria-labelledby="today-title">
      <h2 id="today-title">Branch activity today <small>{data.date}</small></h2>
      <div className="tiles">
        <div className="card tile"><span className="num">{data.total_applications}</span>branch applications today</div>
        <div className="card tile"><span className="num">{data.average_score ?? "-"}</span>average score{data.average_score == null && <small> (nothing scored yet)</small>}</div>
        <div className="card tile"><span className="num">{data.high_risk_count}</span>flagged high risk today</div>
      </div>
      {data.total_applications === 0 && <p className="muted">0 applications today. Earlier applications awaiting review are listed below.</p>}
    </section>
    <section className="review-section" aria-labelledby="queue-title">
      <h2 id="queue-title">Manager review queue</h2>
      <p className="muted">All dates · High-risk applications first, then manual reviews, then oldest first. Review data and reasons before approving.</p>
      <div className="tiles">
        <Link className="card tile metric-link" to="/loan-applications?view=review"><span className="num">{queue.length}</span>awaiting manager review →</Link>
        <Link className="card tile metric-link" to="/loan-applications?view=high-risk"><span className="num">{queue.filter((a) => a.dsr_flag_high_risk).length}</span>high-risk reviews →</Link>
        <Link className="card tile metric-link" to="/loan-applications?view=eligible"><span className="num">{queue.filter(canApprove).length}</span>eligible for an approval decision →</Link>
      </div>
      {queue.length === 0 ? <Empty text="No applications awaiting manager review." /> : <>
        <div className="scroll"><table>
          <thead><tr><th>Application / Officer</th><th>Loan / score</th><th>Review reason</th><th /></tr></thead>
          <tbody>{queue.slice(0, 8).map((a) => <tr key={a.id}>
            <td><strong>#{a.id.slice(0, 8)}</strong><br />{a.owner_name}<br /><small>{formatDateTime(a.created_at)}</small></td>
            <td>{vnd(a.loan_amount)}<br />Score: {a.latest_score?.score ?? "Not available"}</td>
            <td className="wrap-cell"><StatusBadge status={a.status} /> <RiskBadge high={a.dsr_flag_high_risk} /><p>{reviewReason(a)}</p></td>
            <td><Link to={`/loan-applications/${a.id}`}>Review application</Link></td>
          </tr>)}</tbody>
        </table></div>
        <p><Link to="/loan-applications?view=review">View the full review queue ({queue.length})</Link></p>
      </>}
    </section>
    <div className="card role-task">
      <div><h2>Employee accounts</h2><p>Create Officer accounts and control their access while keeping loan records.</p></div>
      <Link className="button" to="/admin/users">Manage employees</Link>
    </div>
  </>;
}
