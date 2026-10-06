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
        <div className="brand">
          <span className="logo" aria-hidden="true">$</span>
          <div>
            <h1>Listing Price Guide</h1>
            <p>Find a fair nightly price for your new Airbnb listing</p>
          </div>
        </div>
      </header>

      <main>
        {loadError ? (
          <div className="card result">
            <h2>The price service is not available</h2>
            <p className="error-text">{loadError}</p>
            <button className="primary" onClick={() => window.location.reload()}>Try again</button>
          </div>
        ) : !options ? (
          <p className="muted loading-page">Loading…</p>
        ) : (
          <div className="layout">
            <ListingForm options={options} form={form} setField={setField} errors={errors} onSubmit={submit} loading={loading} />
            <ResultPanel result={result} loading={loading} error={resultError} stale={stale}
              tips={tips} modelInfo={modelInfo} onRefresh={submit} />
          </div>
        )}
      </main>

      <footer>
        IT3051 Mini Project · Group Mine4Data · Based on Airbnb listings from 2017 (Kaggle).
        Prices are estimates to help you decide, not guarantees.
      </footer>
    </div>
  );
}
