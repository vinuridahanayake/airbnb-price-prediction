import { useMemo, useState } from "react";

const COMMON_SHARE = 0.02;

const AMENITY_ICONS = {
  "Wireless Internet": "📶",
  "Internet": "🌐",
  "Air conditioning": "❄️",
  "Kitchen": "🍳",
  "Heating": "🌡️",
  "Washer": "🧺",
  "Dryer": "🌀",
  "TV": "📺",
  "Cable TV": "📡",
  "Free parking on premises": "🚗",
  "Smoke detector": "🔔",
  "Carbon monoxide detector": "🛡️",
  "First aid kit": "🩹",
  "Fire extinguisher": "🧯",
  "Essentials": "🧴",
  "Shampoo": "🧴",
  "Hangers": "👔",
  "Hair dryer": "💨",
  "Iron": "👔",
  "Laptop friendly workspace": "💻",
  "Self check-in": "🔑",
  "Keypad": "🔢",
  "Lockbox": "📦",
  "Pool": "🏊",
  "Hot tub": "♨️",
  "Gym": "🏋️",
  "Elevator": "🛗",
  "Indoor fireplace": "🪵",
  "Pets allowed": "🐾",
  "Family/kid friendly": "👶",
  "Bathtub": "🛁",
  "Coffee maker": "☕",
  "Refrigerator": "🧊",
  "Dishes and silverware": "🍽️",
  "Cooking basics": "🧂",
  "Oven": "🍕",
  "Stove": "🔥",
  "Microwave": "🍲",
  "Patio or balcony": "🌿",
  "Garden or backyard": "🌳",
  "Breakfast": "🥐",
  "Luggage dropoff allowed": "🧳",
  "Long term stays allowed": "📅",
};

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
        <div className="amenity-search-box">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search amenities (e.g. Wifi, AC, Pool, Kitchen)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search amenities"
          />
          {query && (
            <button type="button" className="clear-search-btn" onClick={() => setQuery("")} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>
        <div className="amenity-stats-row">
          <span className="amenity-count-badge">
            <span className="count-number">{selected.length}</span> selected
          </span>
          {selected.length > 0 && (
            <button type="button" className="link clear-all-link" onClick={() => onChange([])}>
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="chips" role="group" aria-label="Amenities">
        {visible.map((a) => {
          const isSelected = chosen.has(a.name);
          const icon = AMENITY_ICONS[a.name];
          const pct = Math.round(a.share_of_listings * 100);
          return (
            <button
              key={a.name}
              type="button"
              className={`chip${isSelected ? " on" : ""}`}
              aria-pressed={isSelected}
              onClick={() => toggle(a.name)}
              title={`${pct}% of listings include this amenity`}
            >
              {icon && <span className="chip-icon" aria-hidden="true">{icon}</span>}
              <span className="chip-name">{a.name}</span>
              {isSelected ? (
                <span className="chip-check" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              ) : pct >= 50 ? (
                <span className="chip-pct" aria-hidden="true">{pct}%</span>
              ) : null}
            </button>
          );
        })}
        {visible.length === 0 && (
          <div className="amenities-empty">
            <p className="muted">No amenity found matching “{query}”.</p>
          </div>
        )}
      </div>

      {!query && (
        <div className="amenity-footer-toggle">
          <button type="button" className="link show-more-toggle" onClick={() => setShowAll((s) => !s)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {showAll ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
            </svg>
            <span>{showAll ? "Show common amenities only" : `Show all ${amenities.length} amenities`}</span>
          </button>
        </div>
      )}
    </div>
  );
}
