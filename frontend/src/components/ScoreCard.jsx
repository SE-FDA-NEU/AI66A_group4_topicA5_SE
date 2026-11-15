import { formatDateTime } from "../format";
import { scoreLabelText } from "../glossary";
import { visibleFactors } from "../scoreFactors";

export default function ScoreCard({ result, status, showModelVersion = false }) {
  if (!result) return <p className="muted">This application has not been scored yet.</p>;
  if (result.score == null && result.rejected_reason === "score_out_of_range")
    return (
      <div className="alert">
        The model returned an invalid score, so no score is shown. A manager will review this application.
      </div>
    );
  const rejected = result.label === "rejected";
  const factors = visibleFactors(result.explanation);
  return (
    <div className={`score ${result.label ?? ""}`}>
      <div className="big">{result.score ?? "-"}<small>{result.score != null && " / 100"}</small></div>
      <div>
        <strong>{scoreLabelText(result.label, result.label_text)}</strong>
        {status === "manual_review" && <p>Requires manager review.</p>}
        <p className="muted">
          Scored {formatDateTime(result.created_at)}
          {showModelVersion && ` · Model ${result.model_version ?? "-"}`}
        </p>
        <h3>{rejected ? "Why it was rejected" : "Main factors"}</h3>
        {factors.length === 0 ? <p className="muted">No main factors.</p> : (
          <ul className="factor-list">
            {factors.map(({ points, text }, index) => {
              const dir = points === null ? "neutral" : points > 0 ? "up" : "down";
              return (
                <li key={index} className={`factor ${dir}`}>
                  <span aria-hidden="true">{dir === "up" ? "↑" : dir === "down" ? "↓" : "•"}</span>
                  {dir !== "neutral" && <span className="sr-only">{dir === "up" ? "Raises score: " : "Lowers score: "}</span>}
                  {text}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
