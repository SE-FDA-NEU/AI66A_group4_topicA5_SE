import { formatDateTime } from "../format";

export default function ScoreHistory({ history }) {
  if (!history || history.length === 0) return <p className="muted">No history available</p>;
  return (
    <div className="scroll"><table>
      <thead><tr><th>Time</th><th>Score</th><th>Result</th><th>Model version</th></tr></thead>
      <tbody>{history.map((item, index) => <tr key={item.id ?? index}>
        <td>{formatDateTime(item.created_at)}</td>
        <td>{item.score ?? "-"}</td>
        <td>{item.label_text ?? "-"}</td>
        <td>{item.model_version ?? "-"}</td>
      </tr>)}</tbody>
    </table></div>
  );
}
