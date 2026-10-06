// "What-if" tips: re-run the model with one realistic change at a time (via POST /predict/batch)
// and report the changes that raise the predicted price the most.

// Amenities that describe the building or the host's situation rather than something a host can add.
const NOT_ACTIONABLE = new Set([
  "Pets live on this property", "Dog(s)", "Cat(s)", "Elevator", "Doorman", "Pool", "Gym",
  "Wheelchair accessible", "Private entrance", "Indoor fireplace", "Private living room",
  "Free parking on premises", "Buzzer/wireless intercom", "Smoking allowed", "Suitable for events",
  "Hot tub", "Lock on bedroom door",
]);
const MIN_SHARE = 0.02; // only amenities common enough for the model to use them directly
export const MAX_TIPS = 5;
export const MIN_GAIN = 1; // US$ per night

/** Returns [{ label, listing }] — the unchanged listing first, then one variant per change. */
export function buildVariants(payload, amenities) {
  const have = new Set(payload.amenities ?? []);
  const variants = [{ label: "current", listing: payload }];

  for (const { name, share_of_listings } of amenities) {
    if (share_of_listings < MIN_SHARE || have.has(name) || NOT_ACTIONABLE.has(name)) continue;
    variants.push({ label: `Add “${name}” to your amenities`, listing: { ...payload, amenities: [...have, name] } });
  }
  if (payload.instant_bookable !== true)
    variants.push({ label: "Turn on Instant Book", listing: { ...payload, instant_bookable: true } });
  if (payload.accommodates < 16) {
    const more = { ...payload, accommodates: payload.accommodates + 1 };
    if (payload.beds !== undefined && payload.beds < 18) more.beds = payload.beds + 1;
    variants.push({ label: "Host one more guest (add a bed)", listing: more });
  }
  return variants.slice(0, 100); // batch limit of the API
}

/** Pairs batch predictions with their labels and keeps the best positive changes. */
export function rankTips(variants, predictions) {
  const base = predictions[0].predicted_price;
  return variants
    .slice(1)
    .map((v, i) => ({ label: v.label, gain: predictions[i + 1].predicted_price - base }))
    .filter((t) => t.gain >= MIN_GAIN)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, MAX_TIPS);
}
