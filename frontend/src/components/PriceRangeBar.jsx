const usd = (v) => `$${Math.round(v)}`;

/** High-fidelity interactive-style bar representing the wide (80%) range, likely (50%) band, and target price pin. */
export default function PriceRangeBar({ price, likely, wide }) {
  const span = Math.max(1, wide.high - wide.low);
  const pct = (v) => Math.min(100, Math.max(0, ((v - wide.low) / span) * 100));
  const pos = (v) => `${pct(v).toFixed(1)}%`;
  // inner labels are dropped when they would overlap the end labels
  const roomy = (v) => pct(v) > 16 && pct(v) < 84;

  const likelyLeft = pct(likely.low);
  const likelyWidth = Math.max(2, pct(likely.high) - likelyLeft);

  return (
    <figure className="range">
      <div className="range-header">
        <span className="range-title">Market Price Distribution</span>
        <span className="range-badge">Confidence Band</span>
      </div>

      <div
        className="range-track"
        role="img"
        aria-label={`Suggested ${usd(price)}. Likely range ${usd(likely.low)} to ${usd(likely.high)}; wider range ${usd(wide.low)} to ${usd(wide.high)}.`}
      >
        <div
          className="range-likely"
          style={{
            left: `${likelyLeft.toFixed(1)}%`,
            width: `${likelyWidth.toFixed(1)}%`,
          }}
          title={`Likely market band: ${usd(likely.low)} – ${usd(likely.high)}`}
        />
        <div
          className="range-marker"
          style={{ left: pos(price) }}
          title={`Suggested rate: ${usd(price)}`}
        >
          <div className="marker-pin" />
          <div className="marker-tooltip">{usd(price)}</div>
        </div>
      </div>

      <div className="range-labels" aria-hidden="true">
        <span className="label-bound start" style={{ left: 0 }}>
          <small>Low</small>
          {usd(wide.low)}
        </span>
        {roomy(likely.low) && (
          <span className="label-likely" style={{ left: pos(likely.low) }}>
            {usd(likely.low)}
          </span>
        )}
        {roomy(likely.high) && (
          <span className="label-likely" style={{ left: pos(likely.high) }}>
            {usd(likely.high)}
          </span>
        )}
        <span className="label-bound end" style={{ left: "100%" }}>
          <small>High</small>
          {usd(wide.high)}
        </span>
      </div>

      <figcaption className="range-legend">
        <div className="legend-item">
          <span className="swatch likely" />
          <span><b>Likely band:</b> {Math.round(likely.coverage * 100)}% of comps</span>
        </div>
        <div className="legend-item">
          <span className="swatch wide" />
          <span><b>Wider spread:</b> {Math.round(wide.coverage * 100)}% of comps</span>
        </div>
      </figcaption>
    </figure>
  );
}
