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
      <ol className="steps">
        <li>Tell us <b>where</b> the place is and <b>what kind</b> of place it is.</li>
        <li>Add the details you know. Fields marked <span className="req">*</span> are required. Skip anything you are unsure of and we will fill in a typical value.</li>
        <li>Press <b>Get my price</b>.</li>
      </ol>

      <fieldset>
        <legend>Location</legend>
        <div className="grid two">
          <Field id="city" label="City" required error={errors.city}>
            <select id="city" value={form.city} onChange={(e) => onCity(e.target.value)} aria-invalid={!!errors.city || undefined}>
              <option value="">Choose a city…</option>
              {categories.city.map((c) => <option key={c} value={c}>{CITY_NAMES[c] ?? c}</option>)}
            </select>
          </Field>
          <Field id="neighbourhood" label="Neighbourhood" error={errors.neighbourhood}
            hint={form.city ? "Not listed or not sure? Leave it as it is." : "Choose a city first."}>
            <select id="neighbourhood" value={form.neighbourhood} disabled={!form.city}
              onChange={(e) => setField("neighbourhood", e.target.value)}>
              <option value="">Not sure, estimate it for me</option>
              {(neighbourhoods[form.city] ?? []).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
        </div>
        <button type="button" className="link" onClick={() => setShowCoords((s) => !s)} aria-expanded={showCoords}>
          {showCoords ? "Hide exact location" : "I know the exact coordinates (more accurate)"}
        </button>
        {showCoords && (
          <div className="grid two">
            <Field id="latitude" label="Latitude" error={errors.coordinates} hint="e.g. 40.7081 (in Google Maps, right-click the place)">
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
        <legend>The place</legend>
        <Field id="room_type" label="What will guests have?" required error={errors.room_type}>
          <Segmented id="room_type" ariaLabel="Room type" value={form.room_type} onChange={(v) => setField("room_type", v)}
            options={categories.room_type.map((v) => ({ value: v, label: v === "Entire home/apt" ? "Entire place" : v }))} />
        </Field>
        <div className="grid two">
          <Field id="property_type" label="Property type" required error={errors.property_type}>
            <select id="property_type" value={form.property_type} onChange={(e) => setField("property_type", e.target.value)}
              aria-invalid={!!errors.property_type || undefined}>
              <option value="">Choose a type…</option>
              {MAIN_PROPERTY_TYPES.filter((t) => categories.property_type.includes(t)).map((t) => <option key={t}>{t}</option>)}
              <optgroup label="Other types">
                {otherTypes.map((t) => <option key={t}>{t}</option>)}
              </optgroup>
            </select>
          </Field>
          <Field id="bed_type" label="Bed type" error={errors.bed_type}>
            <select id="bed_type" value={form.bed_type} onChange={(e) => setField("bed_type", e.target.value)}>
              <option value="">Not sure</option>
              {categories.bed_type.map((t) => <option key={t}>{t}</option>)}
            </select>
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
          <Field id="bathrooms" label="Bathrooms" error={errors.bathrooms} hint="1.5 = one and a half">
            <Stepper id="bathrooms" value={form.bathrooms} onChange={(v) => setField("bathrooms", v)} placeholder="–"
              min={ranges.bathrooms.min} max={ranges.bathrooms.max} step={0.5} invalid={!!errors.bathrooms} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Booking rules</legend>
        <Field id="cancellation_policy" label="Cancellation policy" error={errors.cancellation_policy}
          hint="Flexible: full refund up to 1 day before. Moderate: up to 5 days before. Strict: 50% refund up to 1 week before.">
          <Segmented id="cancellation_policy" ariaLabel="Cancellation policy" value={form.cancellation_policy}
            onChange={(v) => setField("cancellation_policy", v)} options={CANCELLATION} />
        </Field>
        <div className="grid two">
          <Field id="cleaning_fee" label="Will you charge a cleaning fee?" error={errors.cleaning_fee}>
            <Segmented id="cleaning_fee" ariaLabel="Cleaning fee" value={form.cleaning_fee}
              onChange={(v) => setField("cleaning_fee", v)} options={YES_NO} />
          </Field>
          <Field id="instant_bookable" label="Instant Book (no approval needed)?" error={errors.instant_bookable}>
            <Segmented id="instant_bookable" ariaLabel="Instant Book" value={form.instant_bookable}
              onChange={(v) => setField("instant_bookable", v)} options={YES_NO} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Amenities</legend>
        <p className="hint">Select everything guests can use. More amenities usually mean a higher price.</p>
        <AmenityPicker amenities={options.amenities} selected={form.amenities} onChange={(v) => setField("amenities", v)} />
        {errors.amenities && <p className="error-text" role="alert">{errors.amenities}</p>}
      </fieldset>

      <div className="submit-row">
        {errorCount > 0 && (
          <p className="error-text" role="alert">
            Please fix the {errorCount === 1 ? "highlighted field" : `${errorCount} highlighted fields`} above.
          </p>
        )}
        <button type="submit" className="primary" disabled={loading}>
          {loading ? "Calculating…" : "Get my price"}
        </button>
      </div>
    </form>
  );
}
