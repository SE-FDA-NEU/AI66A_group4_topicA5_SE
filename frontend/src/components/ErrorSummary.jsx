import { FIELD_LABELS } from "../validation";

export default function ErrorSummary({ errors, idPrefix, message }) {
  const fieldNames = Object.keys(errors).filter((name) => name !== "form" && errors[name]);
  if (fieldNames.length === 0) {
    const text = errors.form || message;
    return text ? <div className="alert" role="alert">{text}</div> : null;
  }
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
    </div>
  );
}
