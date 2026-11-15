export default function DataList({ rows }) {
  return (
    <dl className="data-list">
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: "contents" }}>
          <dt>{label}</dt>
          <dd>{value == null ? "Not provided" : value}</dd>
        </div>
      ))}
    </dl>
  );
}
