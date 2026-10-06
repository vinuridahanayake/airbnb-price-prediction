const usd = (v) => `$${Math.round(v)}`;

/** Bar from the wide (80%) range, with the likely (50%) band and a marker at the suggested price. */
export default function PriceRangeBar({ price, likely, wide }) {
  const span = wide.high - wide.low;
  const pct = (v) => ((v - wide.low) / span) * 100;
  const pos = (v) => `${pct(v)}%`;
  // inner labels are dropped when they would overlap the end labels
  const roomy = (v) => pct(v) > 14 && pct(v) < 86;
  return (
    <figure className="range">
      <div className="range-track" role="img"
        aria-label={`Suggested ${usd(price)}. Likely range ${usd(likely.low)} to ${usd(likely.high)}; wider range ${usd(wide.low)} to ${usd(wide.high)}.`}>
        <div className="range-likely" style={{ left: pos(likely.low), width: `calc(${pos(likely.high)} - ${pos(likely.low)})` }} />
        <div className="range-marker" style={{ left: pos(price) }} />
      </div>
      <div className="range-labels" aria-hidden="true">
        <span style={{ left: 0 }}>{usd(wide.low)}</span>
        {roomy(likely.low) && <span style={{ left: pos(likely.low) }}>{usd(likely.low)}</span>}
        {roomy(likely.high) && <span style={{ left: pos(likely.high) }}>{usd(likely.high)}</span>}
        <span style={{ left: "100%" }}>{usd(wide.high)}</span>
      </div>
      <figcaption className="range-legend">
        <span><i className="swatch likely" /> Likely range: {Math.round(likely.coverage * 100)}% of similar listings</span>
        <span><i className="swatch wide" /> Wider range: {Math.round(wide.coverage * 100)}%</span>
      </figcaption>
    </figure>
  );
}
