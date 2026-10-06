// Unit tests for the frontend logic (npm test). The backend has its own tests in tests/test_backend.py.
import { describe, expect, it } from "vitest";
import { EMPTY_FORM, mapServerErrors, toPayload, validate } from "./listing.js";
import { buildVariants, rankTips } from "./whatif.js";

const OPTIONS = {
  numeric_ranges: {
    accommodates: { min: 1, max: 16 },
    bathrooms: { min: 0.5, max: 8 },
    bedrooms: { min: 0, max: 10 },
    beds: { min: 1, max: 18 },
  },
  city_bounds: { NYC: { lat_min: 40.45, lat_max: 40.96, lon_min: -74.3, lon_max: -73.66 } },
};
const VALID = { ...EMPTY_FORM, city: "NYC", room_type: "Private room", property_type: "Apartment", accommodates: "2" };

describe("validate", () => {
  it("accepts a form with only the required fields", () => {
    expect(validate(VALID, OPTIONS)).toEqual({});
  });

  it("reports every missing required field", () => {
    const errors = validate({ ...EMPTY_FORM, accommodates: "" }, OPTIONS);
    expect(Object.keys(errors).sort()).toEqual(["accommodates", "city", "property_type", "room_type"]);
  });

  it.each([
    ["accommodates", "0", "between 1 and 16"],
    ["accommodates", "2.5", "whole number"],
    ["bedrooms", "11", "between 0 and 10"],
    ["beds", "0", "between 1 and 18"],
    ["bathrooms", "1.3", "whole or half"],
    ["bathrooms", "abc", "must be a number"],
  ])("rejects %s = %s", (field, value, message) => {
    expect(validate({ ...VALID, [field]: value }, OPTIONS)[field]).toContain(message);
  });

  it("checks coordinates are given together and inside the city", () => {
    expect(validate({ ...VALID, latitude: "40.7" }, OPTIONS).coordinates).toContain("both");
    expect(validate({ ...VALID, latitude: "34.05", longitude: "-118.24" }, OPTIONS).coordinates).toContain("outside NYC");
    expect(validate({ ...VALID, latitude: "40.7081", longitude: "-73.9571" }, OPTIONS)).toEqual({});
  });
});

describe("toPayload", () => {
  it("drops blank optional fields and converts types", () => {
    const payload = toPayload({ ...VALID, bathrooms: "1.5", cleaning_fee: "no", instant_bookable: "", amenities: ["TV"] });
    expect(payload).toEqual({
      city: "NYC", room_type: "Private room", property_type: "Apartment", accommodates: 2,
      bathrooms: 1.5, cleaning_fee: false, amenities: ["TV"],
    });
  });
});

describe("mapServerErrors", () => {
  it("puts coordinate errors on the coordinates field", () => {
    expect(mapServerErrors({ "latitude/longitude": "outside", city: "bad" })).toEqual({ coordinates: "outside", city: "bad" });
  });
});

describe("what-if tips", () => {
  const amenities = [
    { name: "TV", share_of_listings: 0.7 },
    { name: "Air conditioning", share_of_listings: 0.75 },
    { name: "Doorman", share_of_listings: 0.06 },     // building feature: not a tip
    { name: "Hammock", share_of_listings: 0.001 },    // too rare for the model to use
  ];
  const payload = { city: "NYC", room_type: "Private room", property_type: "Apartment", accommodates: 2, amenities: ["TV"] };

  it("builds one variant per realistic change, current listing first", () => {
    const labels = buildVariants(payload, amenities).map((v) => v.label);
    expect(labels).toEqual(["current", "Add “Air conditioning” to your amenities", "Turn on Instant Book", "Host one more guest (add a bed)"]);
  });

  it("keeps only positive gains, best first", () => {
    const variants = buildVariants(payload, amenities);
    const prices = [100, 108, 99.5, 112].map((p) => ({ predicted_price: p }));
    expect(rankTips(variants, prices)).toEqual([
      { label: "Host one more guest (add a bed)", gain: 12 },
      { label: "Add “Air conditioning” to your amenities", gain: 8 },
    ]);
  });
});
