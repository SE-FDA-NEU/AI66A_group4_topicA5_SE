export default function PageHeader({ title, badge, actions }) {
  return (
    <header className="page-header">
      <h1>{title} {badge}</h1>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
