import { formatDateTime } from "../format";

export default function ScoreCard({ result, status }) {
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
        <p className="muted">Scored {formatDateTime(result.created_at)} · Model {result.model_version ?? "-"}</p>
        <h3>{rejected ? "Why it was rejected" : "Main factors"}</h3>
        <ul>{(result.explanation ?? []).map((line, index) => <li key={index}>{line}</li>)}</ul>
      </div>
    </div>
  );
}
