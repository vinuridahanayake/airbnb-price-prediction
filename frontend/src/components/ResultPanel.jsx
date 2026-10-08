import { useState } from "react";
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

export default function ResultPanel({ result, loading, error, stale, tips, modelInfo, onRefresh, onApplyTip }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!result) return;
    const price = Math.round(result.predicted_price);
    const low = Math.round(result.likely_range.low);
    const high = Math.round(result.likely_range.high);
    const text = `Airbnb Valuation Estimate: $${price}/night (Likely Market Band: $${low} - $${high}/night). Powered by tuned XGBoost ML.`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        <h2>Prediction Error</h2>
        <p className="error-text">{error}</p>
        <button type="button" className="btn-secondary" onClick={onRefresh}>
          Try again
        </button>
      </aside>
    );

  if (!result)
    return (
      <aside className="card result empty" aria-live="polite">
        <div className="empty-hero">
          <div className="empty-icon-ring">
            <div className="empty-icon-inner" aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <h2>{loading ? "Calculating Rate…" : "Ready for Valuation"}</h2>
          <p className="empty-lead">
            {loading
              ? "Running listing parameters through our tuned XGBoost pipeline…"
              : "Enter your property specs on the left or select a Quick Preset to generate an instant ML valuation."}
          </p>
        </div>

        <div className="preview-features">
          <div className="preview-feature-item">
            <span className="preview-feature-icon">🎯</span>
            <div className="preview-feature-text">
              <strong>74,000+ Listing Comps</strong>
              <span>Calibrated across 6 major US metropolitan markets</span>
            </div>
          </div>
          <div className="preview-feature-item">
            <span className="preview-feature-icon">📈</span>
            <div className="preview-feature-text">
              <strong>Monthly Revenue Forecast</strong>
              <span>Estimated gross income at 80% typical occupancy</span>
            </div>
          </div>
          <div className="preview-feature-item">
            <span className="preview-feature-icon">💡</span>
            <div className="preview-feature-text">
              <strong>Revenue Optimization Tips</strong>
              <span>Interactive one-click amenity upgrades</span>
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
        ? { ...f, label: "Coordinates", text: `${f.value}, ${byField.longitude.value}` }
        : { ...f, label: LABELS[f.field] ?? f.field, text: show(f.value) },
    );

  const priceNum = Math.round(result.predicted_price);
  const likelyLow = Math.round(result.likely_range.low);
  const likelyHigh = Math.round(result.likely_range.high);
  const estMonthly = Math.round(priceNum * 30 * 0.8);

  return (
    <aside className={`card result${loading ? " busy" : ""}`} aria-live="polite">
      {stale && (
        <button type="button" className="stale" onClick={onRefresh} title="Click to recalculate with your latest form changes">
          <div className="stale-inner">
            <span className="stale-dot" />
            <span>Listing modified • <b>Update estimate</b></span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </div>
        </button>
      )}

      <div className="result-hero-card">
        <div className="hero-top-row">
          <span className="eyebrow">Recommended Nightly Rate</span>
          <span className="hero-badge">ML Valuation</span>
        </div>
        <div className="price-container">
          <div className="price">
            <span className="price-currency">$</span>
            <span className="price-amount">{priceNum}</span>
            <span className="price-unit">/ night</span>
          </div>
        </div>

        <div className="revenue-pill-row">
          <div className="revenue-pill" title="Estimated gross revenue assuming 80% occupancy (24 nights/month)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <span>Est. Gross: <b>${estMonthly.toLocaleString()}</b> / mo</span>
          </div>
          <button type="button" className="copy-btn" onClick={handleCopy}>
            {copied ? (
              <span className="copied-text">✓ Copied</span>
            ) : (
              <span>Copy</span>
            )}
          </button>
        </div>

        <p className="price-sub">
          Similar listings in this market typically book between <b>${likelyLow}</b> and <b>${likelyHigh}</b>.
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
            <div className="section-headings">
              <h3>Pricing Advisories</h3>
              <p className="section-sub">Factors affecting precision of this valuation</p>
            </div>
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
              <h3>Intelligent Defaults Used</h3>
              <p className="section-sub">Median values applied for unselected optional fields</p>
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

      <WhatIfTips state={tips} onApplyTip={onApplyTip} />

      {modelInfo && (
        <div className="model-note-card">
          <div className="model-note-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Model Verification & Trust</span>
          </div>
          <p className="model-note-text">
            Tuned <b>XGBoost Regressor</b> evaluated on <b>{modelInfo.test_rows?.toLocaleString() || "14,822"} unseen test listings</b>.
            Median absolute error: <b>±${Math.round(modelInfo.test_metrics?.["MedAE ($)"] || 21.5)}</b>.
          </p>
        </div>
      )}
    </aside>
  );
}
