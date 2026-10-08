// High-polish form input building blocks.

export function Field({ id, label, required, hint, error, children }) {
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id} className="field-label">
        <span className="field-label-text">{label}</span>
        {required ? (
          <span className="req" title="Required field" aria-hidden="true">*</span>
        ) : (
          <span className="opt">optional</span>
        )}
      </label>
      {children}
      {error ? (
        <p className="error-text" id={`${id}-error`} role="alert">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="hint" id={`${id}-hint`}>{hint}</p>
      ) : null}
    </div>
  );
}

/** Row of toggle buttons that behaves like an accessible radio group. */
export function Segmented({ id, value, onChange, options, ariaLabel }) {
  return (
    <div className="segmented-wrapper">
      <div className="segmented" role="radiogroup" aria-label={ariaLabel} id={id}>
        {options.map((o) => {
          const isActive = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              className={isActive ? "active" : ""}
              onClick={() => onChange(o.value)}
            >
              {o.icon && <span className="seg-icon" aria-hidden="true">{o.icon}</span>}
              <span className="seg-label">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Number input with tactile − / + buttons. An empty value means "not sure". */
export function Stepper({ id, value, onChange, min, max, step = 1, placeholder, invalid }) {
  const current = value === "" ? null : Number(value);
  const bump = (delta) => {
    const start = current ?? (delta > 0 ? min - step : min);
    const next = Math.min(max, Math.max(min, Math.round((start + delta) / step) * step));
    onChange(String(next));
  };
  return (
    <div className={`stepper${invalid ? " has-stepper-error" : ""}`}>
      <button
        type="button"
        aria-label="decrease"
        onClick={() => bump(-step)}
        disabled={current !== null && current <= min}
        className="stepper-btn dec"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
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
        className="stepper-input"
      />
      <button
        type="button"
        aria-label="increase"
        onClick={() => bump(step)}
        disabled={current !== null && current >= max}
        className="stepper-btn inc"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
