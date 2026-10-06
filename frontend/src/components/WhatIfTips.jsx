export default function WhatIfTips({ state }) {
  if (state.status === "idle") return null;
  return (
    <section className="card-section" aria-live="polite">
      <h3>Ways to earn more</h3>
      {state.status === "loading" && <p className="muted">Testing small changes to your listing…</p>}
      {state.status === "error" && <p className="muted">Tips are not available right now.</p>}
      {state.status === "done" && state.tips.length === 0 && (
        <p className="muted">Your listing already has the features that add the most value.</p>
      )}
      {state.status === "done" && state.tips.length > 0 && (
        <>
          <ul className="tips">
            {state.tips.map((t) => (
              <li key={t.label}>
                <span>{t.label}</span>
                <strong className="gain">+${t.gain.toFixed(0)}<small>/night</small></strong>
              </li>
            ))}
          </ul>
          <p className="footnote">
            Each tip re-runs the model with one change. It shows how prices of similar listings differ, not a guaranteed increase.
          </p>
        </>
      )}
    </section>
  );
}
