// Small building blocks shared by the form.

export function Field({ id, label, required, hint, error, children }) {
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required ? <span className="req" aria-hidden="true"> *</span> : <span className="opt"> optional</span>}
      </label>
      {children}
      {error ? (
        <p className="error-text" id={`${id}-error`} role="alert">{error}</p>
      ) : hint ? (
        <p className="hint" id={`${id}-hint`}>{hint}</p>
      ) : null}
    </div>
  );
}

/** Row of toggle buttons that behaves like a radio group. */
export function Segmented({ id, value, onChange, options, ariaLabel }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={ariaLabel} id={id}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Number input with − / + buttons. An empty value means "not sure". */
export function Stepper({ id, value, onChange, min, max, step = 1, placeholder, invalid }) {
  const current = value === "" ? null : Number(value);
  const bump = (delta) => {
    const start = current ?? (delta > 0 ? min - step : min);
    const next = Math.min(max, Math.max(min, Math.round((start + delta) / step) * step));
    onChange(String(next));
  };
  return (
    <div className="stepper">
      <button type="button" aria-label="decrease" onClick={() => bump(-step)} disabled={current !== null && current <= min}>−</button>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : `${id}-hint`}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" aria-label="increase" onClick={() => bump(step)} disabled={current !== null && current >= max}>+</button>
    </div>
  );
}
