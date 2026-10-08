import { useMemo, useState } from "react";

const COMMON_SHARE = 0.02;

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "popular", label: "🔥 Top Amenities" },
  { id: "essentials", label: "📶 Essentials" },
  { id: "kitchen", label: "🍳 Kitchen" },
  { id: "comfort", label: "✨ Comfort & Space" },
  { id: "safety", label: "🛡️ Safety" },
];

const ESSENTIAL_KEYS = ["internet", "wifi", "air conditioning", "heating", "tv", "cable", "essentials", "shampoo", "hanger", "hair dryer", "iron", "workspace", "linen"];
const KITCHEN_KEYS = ["kitchen", "refrigerator", "microwave", "coffee", "dishes", "cooking", "oven", "stove", "dishwasher"];
const COMFORT_KEYS = ["pool", "hot tub", "gym", "elevator", "fireplace", "patio", "balcony", "garden", "backyard", "bathtub", "breakfast", "view"];
const SAFETY_KEYS = ["smoke", "carbon monoxide", "first aid", "fire extinguisher", "lock", "keypad", "lockbox", "check-in"];

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
};

export default function AmenityPicker({ amenities, selected, onChange }) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const chosen = new Set(selected);

  const visible = useMemo(() => {
    let list = amenities;

    // Filter by category tab
    if (activeTab === "popular") {
      list = list.filter((a) => a.share_of_listings >= 0.2);
    } else if (activeTab === "essentials") {
      list = list.filter((a) => ESSENTIAL_KEYS.some((k) => a.name.toLowerCase().includes(k)));
    } else if (activeTab === "kitchen") {
      list = list.filter((a) => KITCHEN_KEYS.some((k) => a.name.toLowerCase().includes(k)));
    } else if (activeTab === "comfort") {
      list = list.filter((a) => COMFORT_KEYS.some((k) => a.name.toLowerCase().includes(k)));
    } else if (activeTab === "safety") {
      list = list.filter((a) => SAFETY_KEYS.some((k) => a.name.toLowerCase().includes(k)));
    } else if (!showAll && !query) {
      list = list.filter((a) => a.share_of_listings >= COMMON_SHARE);
    }

    // Filter by search query
    const q = query.trim().toLowerCase();
    if (q) {
      return amenities.filter((a) => a.name.toLowerCase().includes(q));
    }
    return list;
  }, [amenities, query, activeTab, showAll]);

  const toggle = (name) => {
    const next = new Set(chosen);
    next.has(name) ? next.delete(name) : next.add(name);
    onChange([...next]);
  };

  const selectTopAmenities = () => {
    const top = amenities.filter((a) => a.share_of_listings >= 0.35).map((a) => a.name);
    onChange([...new Set([...selected, ...top])]);
  };

  return (
    <div className="amenities">
      {/* Category Pills Filter */}
      <div className="amenity-tabs" role="tablist" aria-label="Amenity Categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeTab === cat.id}
            className={`amenity-tab${activeTab === cat.id ? " active" : ""}`}
            onClick={() => { setActiveTab(cat.id); setQuery(""); }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="amenity-toolbar">
        <div className="amenity-search-box">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search all amenities (Wifi, AC, Pool, etc.)…"
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

        <div className="amenity-actions-row">
          <button type="button" className="quick-select-link" onClick={selectTopAmenities}>
            + Add Standard Comps
          </button>
          <span className="amenity-count-badge">
            <span className="count-number">{selected.length}</span> selected
          </span>
          {selected.length > 0 && (
            <button type="button" className="clear-all-link" onClick={() => onChange([])}>
              Clear
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
              title={`${pct}% of listings in dataset have this`}
            >
              {icon && <span className="chip-icon" aria-hidden="true">{icon}</span>}
              <span className="chip-name">{a.name}</span>
              {isSelected ? (
                <span className="chip-check" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              ) : pct >= 40 ? (
                <span className="chip-pct" aria-hidden="true">{pct}%</span>
              ) : null}
            </button>
          );
        })}
        {visible.length === 0 && (
          <div className="amenities-empty">
            <p className="muted">No amenities found matching “{query}”.</p>
          </div>
        )}
      </div>

      {!query && activeTab === "all" && (
        <div className="amenity-footer-toggle">
          <button type="button" className="show-more-toggle" onClick={() => setShowAll((s) => !s)}>
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
