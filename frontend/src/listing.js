// Form state <-> API payload, and client-side validation.
// The rules mirror the backend (backend/predictor.py) and use the ranges it publishes at GET /options,
// so the user gets instant feedback; the backend still re-checks everything.

export const REQUIRED = ["city", "room_type", "property_type", "accommodates"];

export const EMPTY_FORM = {
  city: "",
  neighbourhood: "",
  latitude: "",
  longitude: "",
  room_type: "",
  property_type: "",
  accommodates: "2",
  bedrooms: "",
  bathrooms: "",
  beds: "",
  bed_type: "",
  cancellation_policy: "",
  cleaning_fee: "", // "yes" | "no" | "" (not sure)
  instant_bookable: "",
  amenities: [],
};

const INTEGER_FIELDS = ["accommodates", "bedrooms", "beds"];
const LABELS = {
  city: "City",
  room_type: "Room type",
  property_type: "Property type",
  accommodates: "Guests",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  beds: "Beds",
};

const blank = (v) => v === "" || v === null || v === undefined;
const num = (v) => (blank(v) ? null : Number(v));
const yesNo = (v) => (v === "yes" ? true : v === "no" ? false : null);

/** Converts the form into the JSON body expected by POST /predict (blank optional fields are left out). */
export function toPayload(form) {
  const payload = {
    city: form.city,
    room_type: form.room_type,
    property_type: form.property_type,
    accommodates: num(form.accommodates),
    neighbourhood: form.neighbourhood || null,
    latitude: num(form.latitude),
    longitude: num(form.longitude),
    bathrooms: num(form.bathrooms),
    bedrooms: num(form.bedrooms),
    beds: num(form.beds),
    bed_type: form.bed_type || null,
    cancellation_policy: form.cancellation_policy || null,
    cleaning_fee: yesNo(form.cleaning_fee),
    instant_bookable: yesNo(form.instant_bookable),
    amenities: form.amenities,
  };
  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== null));
}

/** Returns { field: message } for every problem found (empty object = valid). */
export function validate(form, options) {
  const errors = {};
  for (const f of REQUIRED) if (blank(form[f])) errors[f] = `${LABELS[f]} is required`;

  for (const [field, range] of Object.entries(options?.numeric_ranges ?? {})) {
    const raw = form[field];
    if (blank(raw)) continue;
    const v = Number(raw);
    if (!Number.isFinite(v)) errors[field] = `${LABELS[field]} must be a number`;
    else if (INTEGER_FIELDS.includes(field) && !Number.isInteger(v)) errors[field] = `${LABELS[field]} must be a whole number`;
    else if (v < range.min || v > range.max) errors[field] = `${LABELS[field]} must be between ${range.min} and ${range.max}`;
    else if (field === "bathrooms" && !Number.isInteger(v * 2)) errors[field] = "Use whole or half bathrooms, e.g. 1 or 1.5";
  }

  const hasLat = !blank(form.latitude);
  const hasLon = !blank(form.longitude);
  if (hasLat !== hasLon) {
    errors.coordinates = "Enter both latitude and longitude, or leave both empty";
  } else if (hasLat) {
    const lat = Number(form.latitude);
    const lon = Number(form.longitude);
    const b = options?.city_bounds?.[form.city];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) errors.coordinates = "Coordinates must be numbers, e.g. 40.7081 and -73.9571";
    else if (b && (lat < b.lat_min || lat > b.lat_max || lon < b.lon_min || lon > b.lon_max))
      errors.coordinates = `These coordinates are outside ${form.city}`;
  }
  return errors;
}

/** Backend field names -> form field names (the backend reports coordinates as one field). */
export function mapServerErrors(fieldErrors) {
  const out = {};
  for (const [field, msg] of Object.entries(fieldErrors)) {
    const key = ["latitude/longitude", "latitude", "longitude", "body"].includes(field) ? "coordinates" : field;
    out[key] = msg;
  }
  return out;
}
