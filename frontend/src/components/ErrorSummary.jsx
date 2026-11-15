import { FIELD_LABELS } from "../validation";

export default function ErrorSummary({ errors, idPrefix, message, fields }) {
  const active = Object.keys(errors).filter((name) => name !== "form" && errors[name]);
  const fieldNames = fields ? active.filter((name) => fields.includes(name)) : active;
  const text = errors.form || message;
  if (fieldNames.length === 0) {
    return text ? <div className="alert" role="alert">{text}</div> : null;
  }
  // Keep the message when the server sent a form-level error or keys that have no rendered field.
  const showText = text && (errors.form || active.length !== fieldNames.length);
  const focusField = (event, name) => {
    event.preventDefault();
    document.getElementById(`${idPrefix}${name}`)?.focus();
  };
  return (
    <div className="alert" role="alert">
      <strong>Please fix these fields:</strong>
      <ul>
        {fieldNames.map((name) => (
          <li key={name}>
            <a href={`#${idPrefix}${name}`} onClick={(event) => focusField(event, name)}>{FIELD_LABELS[name] || name}</a>
          </li>
        ))}
      </ul>
      {showText && <p>{text}</p>}
    </div>
  );
}
