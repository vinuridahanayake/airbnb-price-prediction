import { useState } from "react";
import AmenityPicker from "./AmenityPicker.jsx";
import { Field, Segmented, Stepper } from "./Field.jsx";

const CITY_NAMES = { NYC: "New York City", LA: "Los Angeles", SF: "San Francisco", DC: "Washington, DC", Chicago: "Chicago", Boston: "Boston" };
const MAIN_PROPERTY_TYPES = ["Apartment", "House", "Condominium", "Townhouse", "Loft", "Guesthouse", "Bed & Breakfast", "Bungalow"];
const CANCELLATION = [
  { value: "flexible", label: "Flexible" },
  { value: "moderate", label: "Moderate" },
  { value: "strict", label: "Strict" },
  { value: "", label: "Not sure" },
];
const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "", label: "Not sure" },
];

export default function ListingForm({ options, form, setField, errors, onSubmit, loading }) {
  const [showCoords, setShowCoords] = useState(Boolean(form.latitude));
  const { categories, neighbourhoods, numeric_ranges: ranges } = options;
  const otherTypes = categories.property_type.filter((t) => !MAIN_PROPERTY_TYPES.includes(t));
  const errorCount = Object.keys(errors).length;

  const onCity = (city) => {
    setField("city", city);
    if (!neighbourhoods[city]?.includes(form.neighbourhood)) setField("neighbourhood", "");
  };

  return (
    <form className="card form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} noValidate>
      {/* Visual step guide */}
      <div className="steps-container">
        <div className="steps-header">
          <span className="steps-badge">3 Simple Steps</span>
          <span className="steps-sub">Fill in what you know — we estimate the rest</span>
        </div>
        <div className="step-cards">
          <div className="step-card">
            <span className="step-num">1</span>
            <div className="step-info">
              <strong>Location & Type</strong>
              <span>City, area & space type</span>
            </div>
          </div>
          <div className="step-card">
            <span className="step-num">2</span>
            <div className="step-info">
              <strong>Property Specs</strong>
              <span>Guests, rooms & amenities</span>
            </div>
          </div>
          <div className="step-card">
            <span className="step-num">3</span>
            <div className="step-info">
              <strong>Smart Valuation</strong>
              <span>Instant price & revenue tips</span>
            </div>
          </div>
        </div>
      </div>

      <fieldset>
        <legend>
          <span className="legend-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <span>Location & Neighborhood</span>
        </legend>
        <div className="grid two">
          <Field id="city" label="City" required error={errors.city}>
            <div className="select-wrapper">
              <select id="city" value={form.city} onChange={(e) => onCity(e.target.value)} aria-invalid={!!errors.city || undefined}>
                <option value="">Choose a city…</option>
                {categories.city.map((c) => <option key={c} value={c}>{CITY_NAMES[c] ?? c}</option>)}
              </select>
            </div>
          </Field>
          <Field id="neighbourhood" label="Neighbourhood" error={errors.neighbourhood}
            hint={form.city ? "Not listed or not sure? Leave it as it is." : "Choose a city first."}>
            <div className="select-wrapper">
              <select id="neighbourhood" value={form.neighbourhood} disabled={!form.city}
                onChange={(e) => setField("neighbourhood", e.target.value)}>
                <option value="">Not sure, estimate it for me</option>
                {(neighbourhoods[form.city] ?? []).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </Field>
        </div>
        <div className="coords-toggle-row">
          <button type="button" className="coords-toggle-btn link" onClick={() => setShowCoords((s) => !s)} aria-expanded={showCoords}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            <span>{showCoords ? "Hide exact coordinates" : "I know the exact coordinates (GPS precision)"}</span>
            <span className={`chevron-indicator${showCoords ? " open" : ""}`}>▼</span>
          </button>
        </div>
        {showCoords && (
          <div className="grid two coords-drawer">
            <Field id="latitude" label="Latitude" error={errors.coordinates} hint="e.g. 40.7081 (Google Maps right-click)">
              <input id="latitude" inputMode="decimal" value={form.latitude} placeholder="40.7081"
                onChange={(e) => setField("latitude", e.target.value)} aria-invalid={!!errors.coordinates || undefined} />
            </Field>
            <Field id="longitude" label="Longitude" hint="e.g. -73.9571">
              <input id="longitude" inputMode="decimal" value={form.longitude} placeholder="-73.9571"
                onChange={(e) => setField("longitude", e.target.value)} aria-invalid={!!errors.coordinates || undefined} />
            </Field>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>
          <span className="legend-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <span>Property Specifications</span>
        </legend>
        <Field id="room_type" label="What will guests have?" required error={errors.room_type}>
          <Segmented id="room_type" ariaLabel="Room type" value={form.room_type} onChange={(v) => setField("room_type", v)}
            options={categories.room_type.map((v) => ({
              value: v,
              label: v === "Entire home/apt" ? "Entire place" : v,
              icon: v === "Entire home/apt" ? "🏡" : v === "Private room" ? "🚪" : "👥"
            }))} />
        </Field>
        <div className="grid two">
          <Field id="property_type" label="Property type" required error={errors.property_type}>
            <div className="select-wrapper">
              <select id="property_type" value={form.property_type} onChange={(e) => setField("property_type", e.target.value)}
                aria-invalid={!!errors.property_type || undefined}>
                <option value="">Choose a type…</option>
                {MAIN_PROPERTY_TYPES.filter((t) => categories.property_type.includes(t)).map((t) => <option key={t}>{t}</option>)}
                <optgroup label="Other types">
                  {otherTypes.map((t) => <option key={t}>{t}</option>)}
                </optgroup>
              </select>
            </div>
          </Field>
          <Field id="bed_type" label="Bed type" error={errors.bed_type}>
            <div className="select-wrapper">
              <select id="bed_type" value={form.bed_type} onChange={(e) => setField("bed_type", e.target.value)}>
                <option value="">Not sure (typical used)</option>
                {categories.bed_type.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </Field>
        </div>
        <div className="grid four">
          <Field id="accommodates" label="Guests" required error={errors.accommodates} hint={`Up to ${ranges.accommodates.max}`}>
            <Stepper id="accommodates" value={form.accommodates} onChange={(v) => setField("accommodates", v)}
              min={ranges.accommodates.min} max={ranges.accommodates.max} invalid={!!errors.accommodates} />
          </Field>
          <Field id="bedrooms" label="Bedrooms" error={errors.bedrooms} hint="0 = studio">
            <Stepper id="bedrooms" value={form.bedrooms} onChange={(v) => setField("bedrooms", v)} placeholder="–"
              min={ranges.bedrooms.min} max={ranges.bedrooms.max} invalid={!!errors.bedrooms} />
          </Field>
          <Field id="beds" label="Beds" error={errors.beds}>
            <Stepper id="beds" value={form.beds} onChange={(v) => setField("beds", v)} placeholder="–"
              min={ranges.beds.min} max={ranges.beds.max} invalid={!!errors.beds} />
          </Field>
          <Field id="bathrooms" label="Bathrooms" error={errors.bathrooms} hint="1.5 = one & half">
            <Stepper id="bathrooms" value={form.bathrooms} onChange={(v) => setField("bathrooms", v)} placeholder="–"
              min={ranges.bathrooms.min} max={ranges.bathrooms.max} step={0.5} invalid={!!errors.bathrooms} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>
          <span className="legend-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <span>Booking & Host Policies</span>
        </legend>
        <Field id="cancellation_policy" label="Cancellation policy" error={errors.cancellation_policy}
          hint="Flexible: 1 day prior refund • Moderate: 5 days prior • Strict: 1 week prior">
          <Segmented id="cancellation_policy" ariaLabel="Cancellation policy" value={form.cancellation_policy}
            onChange={(v) => setField("cancellation_policy", v)} options={CANCELLATION} />
        </Field>
        <div className="grid two">
          <Field id="cleaning_fee" label="Will you charge a cleaning fee?" error={errors.cleaning_fee}>
            <Segmented id="cleaning_fee" ariaLabel="Cleaning fee" value={form.cleaning_fee}
              onChange={(v) => setField("cleaning_fee", v)} options={YES_NO} />
          </Field>
          <Field id="instant_bookable" label="Instant Book (no host approval)?" error={errors.instant_bookable}>
            <Segmented id="instant_bookable" ariaLabel="Instant Book" value={form.instant_bookable}
              onChange={(v) => setField("instant_bookable", v)} options={YES_NO} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>
          <span className="legend-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </span>
          <span>Amenities & Features</span>
        </legend>
        <p className="hint fieldset-desc">Select all amenities available to guests. High-demand amenities directly increase the predicted nightly rate.</p>
        <AmenityPicker amenities={options.amenities} selected={form.amenities} onChange={(v) => setField("amenities", v)} />
        {errors.amenities && <p className="error-text" role="alert">{errors.amenities}</p>}
      </fieldset>

      <div className="submit-row">
        {errorCount > 0 && (
          <div className="form-error-callout" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Please complete the {errorCount === 1 ? "highlighted field" : `${errorCount} highlighted fields`} above.</span>
          </div>
        )}
        <button type="submit" className="primary submit-btn" disabled={loading}>
          {loading ? (
            <span className="btn-loading-state">
              <span className="spinner" />
              <span>Calculating Fair Price…</span>
            </span>
          ) : (
            <span className="btn-content">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>Get My Suggested Price</span>
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
