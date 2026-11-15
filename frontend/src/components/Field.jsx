export default function Field({ id, label, required, hint, error, announce = true, wide = false, children }) {
  return (
    <div className={`field${wide ? " field-wide" : ""}${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="req" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && <small id={`${id}-hint`} className="hint">{hint}</small>}
      {error && <span id={`${id}-error`} className="field-error" role={announce ? "alert" : undefined}>{error}</span>}
    </div>
  );
}
