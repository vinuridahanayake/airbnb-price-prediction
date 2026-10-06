import { useMemo, useState } from "react";

const COMMON_SHARE = 0.02;

export default function AmenityPicker({ amenities, selected, onChange }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const chosen = new Set(selected);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return amenities.filter((a) => a.name.toLowerCase().includes(q));
    return showAll ? amenities : amenities.filter((a) => a.share_of_listings >= COMMON_SHARE);
  }, [amenities, query, showAll]);

  const toggle = (name) => {
    const next = new Set(chosen);
    next.has(name) ? next.delete(name) : next.add(name);
    onChange([...next]);
  };

  return (
    <div className="amenities">
      <div className="amenity-toolbar">
        <input
          type="search"
          placeholder="Search amenities…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search amenities"
        />
        <span className="muted">{selected.length} selected</span>
        {selected.length > 0 && (
          <button type="button" className="link" onClick={() => onChange([])}>Clear</button>
        )}
      </div>
      <div className="chips" role="group" aria-label="Amenities">
        {visible.map((a) => (
          <button
            key={a.name}
            type="button"
            className={`chip${chosen.has(a.name) ? " on" : ""}`}
            aria-pressed={chosen.has(a.name)}
            onClick={() => toggle(a.name)}
            title={`${Math.round(a.share_of_listings * 100)}% of listings have this`}
          >
            {chosen.has(a.name) && <span aria-hidden="true">✓ </span>}
            {a.name}
          </button>
        ))}
        {visible.length === 0 && <p className="muted">No amenity matches “{query}”.</p>}
      </div>
      {!query && (
        <button type="button" className="link" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "Show common amenities only" : `Show all ${amenities.length} amenities`}
        </button>
      )}
    </div>
  );
}
