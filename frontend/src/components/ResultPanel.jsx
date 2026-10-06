import PriceRangeBar from "./PriceRangeBar.jsx";
import WhatIfTips from "./WhatIfTips.jsx";

const LABELS = {
  neighbourhood: "Neighbourhood", bathrooms: "Bathrooms", bedrooms: "Bedrooms", beds: "Beds",
  bed_type: "Bed type", cancellation_policy: "Cancellation policy", cleaning_fee: "Cleaning fee",
  instant_bookable: "Instant Book",
};

function show(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ResultPanel({ result, loading, error, stale, tips, modelInfo, onRefresh }) {
  if (error)
    return (
      <aside className="card result" aria-live="polite">
        <h2>Something went wrong</h2>
        <p className="error-text">{error}</p>
      </aside>
    );

  if (!result)
    return (
      <aside className="card result empty" aria-live="polite">
        <div className="empty-icon" aria-hidden="true">$</div>
        <h2>{loading ? "Calculating your price…" : "Your suggested price will appear here"}</h2>
        <p className="muted">
          The suggestion comes from a model trained on about 74,000 Airbnb listings in six US cities.
          It compares your place with similar listings.
        </p>
      </aside>
    );

  // latitude and longitude are shown together as one "Location" line
  const byField = Object.fromEntries(result.filled_in.map((f) => [f.field, f]));
  const filled = result.filled_in
    .filter((f) => f.field !== "longitude")
    .map((f) =>
      f.field === "latitude"
        ? { ...f, label: "Location", text: `${f.value}, ${byField.longitude.value}` }
        : { ...f, label: LABELS[f.field] ?? f.field, text: show(f.value) },
    );

  return (
    <aside className={`card result${loading ? " busy" : ""}`} aria-live="polite">
      {stale && (
        <button type="button" className="stale" onClick={onRefresh}>
          You changed the listing. <b>Update price</b>
        </button>
      )}
      <p className="eyebrow">Suggested nightly price</p>
      <p className="price">
        ${Math.round(result.predicted_price)}<span> / night</span>
      </p>
      <p className="muted">
        Most similar listings charge between <b>${Math.round(result.likely_range.low)}</b> and{" "}
        <b>${Math.round(result.likely_range.high)}</b>.
      </p>
      <PriceRangeBar price={result.predicted_price} likely={result.likely_range} wide={result.wide_range} />

      {result.warnings.length > 0 && (
        <section className="card-section">
          <h3>Please note</h3>
          <ul className="notes warn">
            {result.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </section>
      )}

      {filled.length > 0 && (
        <section className="card-section">
          <h3>We filled these in for you</h3>
          <p className="footnote">You left these out, so typical values were used. Add them for a more accurate price.</p>
          <ul className="notes filled">
            {filled.map((f) => (
              <li key={f.field}>
                <span>{f.label}</span>
                <b>{f.text}</b>
                <small>{f.reason}</small>
              </li>
            ))}
          </ul>
        </section>
      )}

      <WhatIfTips state={tips} />

      {modelInfo && (
        <p className="footnote model-note">
          How reliable is this? Tested on {modelInfo.test_rows.toLocaleString()} listings the model had never seen,
          half of its suggestions were within ${Math.round(modelInfo.test_metrics["MedAE ($)"])} of the real price.
        </p>
      )}
    </aside>
  );
}
