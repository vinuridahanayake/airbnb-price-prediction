export default function WhatIfTips({ state, onApplyTip }) {
  if (state.status === "idle") return null;

  return (
    <section className="card-section whatif-section" aria-live="polite">
      <div className="section-header-row">
        <div className="section-icon tips-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        </div>
        <div className="section-headings">
          <h3>Revenue Optimization Insights</h3>
          <p className="section-sub">Model-simulated listing upgrades to increase your nightly rate</p>
        </div>
      </div>

      {state.status === "loading" && (
        <div className="tips-loading-box">
          <span className="tips-spinner" />
          <span>Simulating high-impact listing adjustments…</span>
        </div>
      )}

      {state.status === "error" && (
        <p className="muted tips-fallback">Optimization insights are currently unavailable.</p>
      )}

      {state.status === "done" && state.tips.length === 0 && (
        <div className="tips-optimal-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Your listing already includes the key amenities that command top market rates!</span>
        </div>
      )}

      {state.status === "done" && state.tips.length > 0 && (
        <>
          <ul className="tips">
            {state.tips.map((t) => (
              <li key={t.label} className="tip-card">
                <div className="tip-main">
                  <div className="tip-info">
                    <span className="tip-sparkle" aria-hidden="true">💡</span>
                    <span className="tip-text">{t.label}</span>
                  </div>
                  <div className="tip-action-group">
                    <div className="gain-badge">
                      <span className="gain-val">+${t.gain.toFixed(0)}</span>
                      <span className="gain-unit">/ night</span>
                    </div>
                    {onApplyTip && (
                      <button
                        type="button"
                        className="apply-tip-btn"
                        onClick={() => onApplyTip(t)}
                        title="Apply this change to your form"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="footnote tips-footnote">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Simulated with single-variable variants against 74k comp benchmarks.</span>
          </p>
        </>
      )}
    </section>
  );
}
