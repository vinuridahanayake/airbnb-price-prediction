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
      <aside className="card result result-error-panel" aria-live="polite">
        <div className="error-icon-box">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2>Unable to Calculate Price</h2>
        <p className="error-text">{error}</p>
        <button type="button" className="link" onClick={onRefresh}>Try again</button>
      </aside>
    );

  if (!result)
    return (
      <aside className="card result empty" aria-live="polite">
        <div className="empty-hero">
          <div className="empty-icon-ring">
            <div className="empty-icon-inner" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <h2>{loading ? "Analyzing Comps & Pricing…" : "Ready for Valuation"}</h2>
          <p className="empty-lead">
            {loading
              ? "Running your listing specifications through the tuned XGBoost model…"
              : "Fill in your property details on the left to generate an instant, market-accurate nightly price."}
          </p>
        </div>

        <div className="preview-features">
          <div className="preview-feature-item">
            <span className="preview-feature-icon">🎯</span>
            <div className="preview-feature-text">
              <strong>Data-Driven Pricing</strong>
              <span>Trained on 74,000+ real Airbnb listings</span>
            </div>
          </div>
          <div className="preview-feature-item">
            <span className="preview-feature-icon">📊</span>
            <div className="preview-feature-text">
              <strong>Confidence Intervals</strong>
              <span>50% likely target & 80% market bounds</span>
            </div>
          </div>
          <div className="preview-feature-item">
            <span className="preview-feature-icon">💡</span>
            <div className="preview-feature-text">
              <strong>Revenue Optimization</strong>
              <span>Simulation tips to maximize your host return</span>
            </div>
          </div>
        </div>
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

  const priceNum = Math.round(result.predicted_price);
  const likelyLow = Math.round(result.likely_range.low);
  const likelyHigh = Math.round(result.likely_range.high);

  return (
    <aside className={`card result${loading ? " busy" : ""}`} aria-live="polite">
      {stale && (
        <button type="button" className="stale" onClick={onRefresh} title="Click to refresh price estimate">
          <div className="stale-inner">
            <span className="stale-dot" />
            <span>Listing details changed. <b>Update price</b></span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </div>
        </button>
      )}

      <div className="result-hero-card">
        <div className="hero-top-row">
          <span className="eyebrow">Suggested Nightly Rate</span>
          <span className="hero-badge">AI Estimate</span>
        </div>
        <div className="price-container">
          <div className="price">
            <span className="price-currency">$</span>
            <span className="price-amount">{priceNum}</span>
            <span className="price-unit">/ night</span>
          </div>
        </div>
        <p className="price-sub">
          Most comparable listings charge between <b>${likelyLow}</b> and <b>${likelyHigh}</b>.
        </p>
      </div>

      <PriceRangeBar price={result.predicted_price} likely={result.likely_range} wide={result.wide_range} />

      {result.warnings.length > 0 && (
        <section className="card-section warnings-section">
          <div className="section-header-row">
            <span className="section-icon warn-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <h3>Advisories</h3>
          </div>
          <ul className="notes warn">
            {result.warnings.map((w) => (
              <li key={w}>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {filled.length > 0 && (
        <section className="card-section filled-section">
          <div className="section-header-row">
            <span className="section-icon filled-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </span>
            <div className="section-headings">
              <h3>Estimated Market Defaults</h3>
              <p className="footnote">Typical values used for unselected optional fields</p>
            </div>
          </div>
          <div className="filled-tags-grid">
            {filled.map((f) => (
              <div key={f.field} className="filled-tag-card" title={f.reason}>
                <div className="filled-tag-top">
                  <span className="filled-tag-label">{f.label}</span>
                  <span className="filled-tag-val">{f.text}</span>
                </div>
                <small className="filled-tag-reason">{f.reason}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      <WhatIfTips state={tips} />

      {modelInfo && (
        <div className="model-note-card">
          <div className="model-note-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Model Verification & Reliability</span>
          </div>
          <p className="model-note-text">
            Tested on <b>{modelInfo.test_rows?.toLocaleString() || "14,822"} holdout listings</b> never seen during training.
            50% of predictions are within <b>${Math.round(modelInfo.test_metrics?.["MedAE ($)"] || 22)}</b> of the actual market price.
          </p>
        </div>
      )}
    </aside>
  );
}
