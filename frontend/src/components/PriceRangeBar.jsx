const usd = (v) => `$${Math.round(v)}`;

/** High-fidelity financial-grade range bar showing 80% market spread and 50% likely core band. */
export default function PriceRangeBar({ price, likely, wide }) {
  const span = Math.max(1, wide.high - wide.low);
  const pct = (v) => Math.min(100, Math.max(0, ((v - wide.low) / span) * 100));
  const pos = (v) => `${pct(v).toFixed(1)}%`;
  const roomy = (v) => pct(v) > 16 && pct(v) < 84;

  const likelyLeft = pct(likely.low);
  const likelyWidth = Math.max(2, pct(likely.high) - likelyLeft);

  return (
    <figure className="range">
      <div className="range-header">
        <span className="range-title">Market Price Distribution</span>
        <span className="range-badge">Confidence Spread</span>
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
          title={`Likely comp band: ${usd(likely.low)} – ${usd(likely.high)}`}
        />
        <div
          className="range-marker"
          style={{ left: pos(price) }}
          title={`Recommended Rate: ${usd(price)}`}
        >
          <div className="marker-pin" />
        </div>
      </div>

      <div className="range-labels" aria-hidden="true">
        <span className="label-bound start" style={{ left: 0 }}>
          <small>Min Spread</small>
          {usd(wide.low)}
        </span>
        {roomy(likely.low) && (
          <span className="label-likely" style={{ left: pos(likely.low) }}>
            <small>Likely Low</small>
            {usd(likely.low)}
          </span>
        )}
        {roomy(likely.high) && (
          <span className="label-likely" style={{ left: pos(likely.high) }}>
            <small>Likely High</small>
            {usd(likely.high)}
          </span>
        )}
        <span className="label-bound end" style={{ left: "100%" }}>
          <small>Max Spread</small>
          {usd(wide.high)}
        </span>
      </div>

      <figcaption className="range-legend">
        <div className="legend-item">
          <span className="swatch likely" />
          <span><b>Likely Core Band:</b> {Math.round(likely.coverage * 100)}% of comps</span>
        </div>
        <div className="legend-item">
          <span className="swatch wide" />
          <span><b>Full Market Spread:</b> {Math.round(wide.coverage * 100)}% of comps</span>
        </div>
      </figcaption>
    </figure>
  );
}
