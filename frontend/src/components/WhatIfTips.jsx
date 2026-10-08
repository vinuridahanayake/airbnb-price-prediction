export default function WhatIfTips({ state }) {
  if (state.status === "idle") return null;
  return (
    <section className="card-section whatif-section" aria-live="polite">
      <div className="section-header-row">
        <div className="section-title-group">
          <span className="section-icon tips-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </span>
          <div className="section-headings">
            <h3>Revenue Opportunities</h3>
            <p className="section-sub">Model-simulated changes to increase your nightly rate</p>
          </div>
        </div>
      </div>

      {state.status === "loading" && (
        <div className="tips-loading-box">
          <span className="tips-spinner" />
          <span>Simulating {5} high-impact listing adjustments…</span>
        </div>
      )}

      {state.status === "error" && (
        <p className="muted tips-fallback">Optimization suggestions are currently unavailable.</p>
      )}

      {state.status === "done" && state.tips.length === 0 && (
        <div className="tips-optimal-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Your listing already includes the key features that drive top market rates!</span>
        </div>
      )}

      {state.status === "done" && state.tips.length > 0 && (
        <>
          <ul className="tips">
            {state.tips.map((t) => (
              <li key={t.label} className="tip-card">
                <div className="tip-left">
                  <span className="tip-bullet">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                  </span>
                  <span className="tip-text">{t.label}</span>
                </div>
                <div className="gain-badge">
                  <span className="gain-val">+${t.gain.toFixed(0)}</span>
                  <span className="gain-unit">/ night</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="footnote tips-footnote">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Simulated by re-running the ML model with single feature variants against current market comps.</span>
          </p>
        </>
      )}
    </section>
  );
}
