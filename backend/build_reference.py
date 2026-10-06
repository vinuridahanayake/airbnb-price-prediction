"""Builds ``models/backend_reference.json``: the lookup data the Stage 9 backend validates inputs with.

Run once after Stage 7 (and again whenever the final model is retrained):

    py -m backend.build_reference

Everything comes from the TRAINING split, except the price-range quantiles, which are measured on the
held-out TEST split (they describe how far real prices fall from the model's predictions, so they must
come from data the model never saw). Nothing here changes the model.
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from src import preprocessing as pp

ROOT = Path(__file__).resolve().parents[1]
TRAIN = ROOT / "data" / "processed" / "train_clean.pkl"
TEST = ROOT / "data" / "processed" / "test_clean.pkl"
MODEL = ROOT / "models" / "final_model.joblib"
OUT = ROOT / "models" / "backend_reference.json"

COORD_MARGIN = 0.05          # degrees (~5 km) added around each city's training bounding box
RANGE_QUANTILES = {"likely": (0.25, 0.75), "wide": (0.10, 0.90)}


def build() -> dict:
    train = pd.read_pickle(TRAIN)
    test = pd.read_pickle(TEST)
    model = joblib.load(MODEL)

    # categorical levels a user may choose (rare property types are still accepted: the pipeline groups them)
    categories = {c: sorted(train[c].dropna().unique().tolist()) for c in ["city", "room_type", "property_type", "bed_type"]}
    categories["cancellation_policy"] = list(pp.CANCELLATION_ORDER)

    # neighbourhoods are stored as "City | Name" after cleaning -> list plain names per city
    nbhd = train["neighbourhood"].dropna().str.split(" | ", n=1, regex=False)
    neighbourhoods = {city: sorted({parts[1] for parts in nbhd if parts[0] == city}) for city in categories["city"]}

    bounds = train.groupby("city")[["latitude", "longitude"]].agg(["min", "max"])
    city_bounds = {city: {"lat_min": round(bounds.loc[city, ("latitude", "min")] - COORD_MARGIN, 4),
                          "lat_max": round(bounds.loc[city, ("latitude", "max")] + COORD_MARGIN, 4),
                          "lon_min": round(bounds.loc[city, ("longitude", "min")] - COORD_MARGIN, 4),
                          "lon_max": round(bounds.loc[city, ("longitude", "max")] + COORD_MARGIN, 4),
                          "centre": list(pp.CITY_CENTRES[city])}
                   for city in categories["city"]}

    # numeric ranges = what the model has seen in training (0 bathrooms / 0 beds are treated as unknown)
    numeric_ranges = {c: {"min": float(train[c].min()), "max": float(train[c].max())}
                      for c in ["accommodates", "bathrooms", "bedrooms", "beds"]}

    # amenity vocabulary after cleaning, most common first
    prevalence = train["amenity_list"].explode().value_counts() / len(train)
    amenities = [{"name": a, "share_of_listings": round(float(p), 4)} for a, p in prevalence.items()]

    # how far the real test prices were from the predictions (log-space residual quantiles -> price ratios)
    X_test = test.drop(columns=[pp.TARGET])
    residuals = test[pp.TARGET].to_numpy() - model.predict(X_test)
    price_ranges = {name: {"coverage": round(hi - lo, 2),
                           "low_ratio": round(float(np.exp(np.quantile(residuals, lo))), 4),
                           "high_ratio": round(float(np.exp(np.quantile(residuals, hi))), 4)}
                    for name, (lo, hi) in RANGE_QUANTILES.items()}

    return {"categories": categories, "neighbourhoods": neighbourhoods, "city_bounds": city_bounds,
            "numeric_ranges": numeric_ranges, "amenities": amenities, "price_ranges": price_ranges,
            "built_from": {"train_rows": len(train), "test_rows": len(test)}}


if __name__ == "__main__":
    ref = build()
    OUT.write_text(json.dumps(ref, indent=2), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
    print("numeric ranges:", ref["numeric_ranges"])
    print("price ranges:", ref["price_ranges"])
    print("neighbourhoods per city:", {c: len(v) for c, v in ref["neighbourhoods"].items()})
