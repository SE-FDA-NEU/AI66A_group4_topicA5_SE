// The three non-data states every screen needs: loading, error (with retry), empty.
export function Loading({ text = "Loading..." }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="state error" role="alert">
      <p>{message}</p>
      {onRetry && <button onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ text, children }) {
  return (
    <div className="state">
      <p>{text}</p>
      {children}
    </div>
  );
}
