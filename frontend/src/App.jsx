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
    // clear a field's error as soon as the user edits it
    const key = field === "latitude" || field === "longitude" ? "coordinates" : field;
    setErrors((e) => {
      if (!(key in e)) return e;
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
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
      if (id !== requestId.current) return; // a newer request has started
      setResult(res);
      setSubmitted(JSON.stringify(payload));
      // on phones the result sits below the form, so bring it into view
      if (window.matchMedia("(max-width: 920px)").matches)
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="brand-copy">
              <div className="brand-title-row">
                <h1>Airbnb Price Predictor</h1>
                <span className="version-pill">AI Valuation</span>
              </div>
              <p>Find the optimal nightly price for your listing using market intelligence</p>
            </div>
          </div>
          <div className="header-meta">
            <div className="status-pill">
              <span className="live-dot" />
              <span>Model Live</span>
            </div>
            {modelInfo && (
              <div className="meta-pill" title={`Trained on ${modelInfo.train_rows?.toLocaleString()} listings`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                <span>XGBoost • {modelInfo.test_rows ? `${(modelInfo.test_rows + modelInfo.train_rows).toLocaleString()} listings` : "74k comps"}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        {loadError ? (
          <div className="card error-card">
            <div className="error-icon-box">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>Price Prediction Service Unavailable</h2>
            <p className="error-text">{loadError}</p>
            <p className="hint">Make sure the backend is active at port 8010.</p>
            <button className="primary" onClick={() => window.location.reload()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Try reconnecting
            </button>
          </div>
        ) : !options ? (
          <div className="card loading-card">
            <div className="loading-spinner" />
            <h3>Connecting to Prediction Engine…</h3>
            <p className="muted">Fetching listing options and model parameters</p>
          </div>
        ) : (
          <div className="layout">
            <ListingForm options={options} form={form} setField={setField} errors={errors} onSubmit={submit} loading={loading} />
            <ResultPanel result={result} loading={loading} error={resultError} stale={stale}
              tips={tips} modelInfo={modelInfo} onRefresh={submit} />
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-logo-dot" />
            <span>Airbnb Listing Price Guide • IT3051 Mini Project (Mine4Data)</span>
          </div>
          <p className="footer-disclaimer">
            Predictions are ML approximations based on Kaggle Airbnb historical market data (74,000+ US listings).
            Estimates are meant as strategic guidance, not financial guarantees.
          </p>
        </div>
      </footer>
    </div>
  );
}
