import { useEffect, useRef, useState } from "react";
import { ApiError, getModelInfo, getOptions, predict, predictBatch } from "./api.js";
import ListingForm from "./components/ListingForm.jsx";
import ResultPanel from "./components/ResultPanel.jsx";
import { EMPTY_FORM, mapServerErrors, toPayload, validate } from "./listing.js";
import { buildVariants, rankTips } from "./whatif.js";

export default function App() {
  const [options, setOptions] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [resultError, setResultError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tips, setTips] = useState({ status: "idle", tips: [] });
  const [submitted, setSubmitted] = useState(null); // payload of the last successful prediction
  const requestId = useRef(0);

  useEffect(() => {
    getOptions().then(setOptions).catch((e) => setLoadError(e.message));
    getModelInfo().then(setModelInfo).catch(() => {});
  }, []);

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    const key = field === "latitude" || field === "longitude" ? "coordinates" : field;
    setErrors((e) => {
      if (!(key in e)) return e;
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  };

  const handleApplyPreset = (presetData) => {
    setForm({ ...EMPTY_FORM, ...presetData });
    setErrors({});
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setResult(null);
    setTips({ status: "idle", tips: [] });
  };

  const handleApplyTip = (tip) => {
    const match = tip.label.match(/Add “([^”]+)”/);
    if (match) {
      const name = match[1];
      if (!form.amenities.includes(name)) {
        setField("amenities", [...form.amenities, name]);
      }
    } else if (tip.label.includes("Instant Book")) {
      setField("instant_bookable", "yes");
    } else if (tip.label.includes("Host one more guest")) {
      const acc = Number(form.accommodates || 1) + 1;
      setField("accommodates", String(Math.min(16, acc)));
      if (form.beds !== "") {
        setField("beds", String(Math.min(18, Number(form.beds || 1) + 1)));
      }
    }
  };

  async function submit() {
    const clientErrors = validate(form, options);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    const payload = toPayload(form);
    const id = ++requestId.current;
    setLoading(true);
    setResultError(null);
    try {
      const res = await predict(payload);
      if (id !== requestId.current) return;
      setResult(res);
      setSubmitted(JSON.stringify(payload));
      if (window.matchMedia("(max-width: 960px)").matches)
        requestAnimationFrame(() => document.querySelector(".result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      loadTips(payload, id);
    } catch (e) {
      if (id !== requestId.current) return;
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(mapServerErrors(e.fieldErrors));
      else setResultError(e.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  async function loadTips(payload, id) {
    setTips({ status: "loading", tips: [] });
    try {
      const variants = buildVariants(payload, options.amenities);
      const { predictions } = await predictBatch(variants.map((v) => v.listing));
      if (id === requestId.current) setTips({ status: "done", tips: rankTips(variants, predictions) });
    } catch {
      if (id === requestId.current) setTips({ status: "error", tips: [] });
    }
  }

  const stale = Boolean(result) && submitted !== JSON.stringify(toPayload(form));

  return (
    <div className="page">
      <header className="top">
        <div className="top-container">
          <div className="brand">
            <div className="logo-badge" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="brand-copy">
              <div className="brand-title-row">
                <h1>Airbnb Price Predictor</h1>
                <span className="version-pill">AI Valuation Engine</span>
              </div>
              <p>Predict fair market nightly prices and optimize revenue using machine learning</p>
            </div>
          </div>
          <div className="header-meta">
            <div className="status-pill">
              <span className="live-dot" />
              <span>Model Online</span>
            </div>
            <div className="meta-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>XGBoost • 74k Comps</span>
            </div>
            {modelInfo?.test_metrics?.["MedAE ($)"] && (
              <div className="meta-pill accuracy-pill">
                <span>±${Math.round(modelInfo.test_metrics["MedAE ($)"])} MedAE</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        {loadError ? (
          <div className="card error-card">
            <div className="error-icon-box">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>Price Prediction Service Unavailable</h2>
            <p className="error-text">{loadError}</p>
            <p className="hint">Ensure the backend server is running on port 8010.</p>
            <button className="primary" onClick={() => window.location.reload()}>
              Reconnect
            </button>
          </div>
        ) : !options ? (
          <div className="card loading-card">
            <div className="loading-spinner" />
            <h3>Connecting to Valuation Engine…</h3>
            <p className="muted">Loading market datasets, price ranges, and feature encoders</p>
          </div>
        ) : (
          <div className="layout">
            <ListingForm
              options={options}
              form={form}
              setField={setField}
              errors={errors}
              onSubmit={submit}
              loading={loading}
              onReset={handleReset}
              onApplyPreset={handleApplyPreset}
            />
            <ResultPanel
              result={result}
              loading={loading}
              error={resultError}
              stale={stale}
              tips={tips}
              modelInfo={modelInfo}
              onRefresh={submit}
              onApplyTip={handleApplyTip}
            />
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-logo-dot" />
            <span>Airbnb Price Predictor • Advanced Machine Learning Valuation System</span>
          </div>
          <p className="footer-disclaimer">
            Model trained on 74,000+ historical Airbnb US listings (Kaggle). Estimates serve as strategic pricing intelligence for hosts and investors.
          </p>
        </div>
      </footer>
    </div>
  );
}
