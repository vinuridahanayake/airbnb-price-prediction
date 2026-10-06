"""Loads the final model and turns a validated listing into a price prediction (Stage 9).

The flow for every request is the same as in model development:

    user input --validate--> raw listing row --src.preprocessing.clean_and_engineer--> cleaned row
               --final_model.joblib (Stage 4 learned preprocessing + tuned XGBoost)--> log_price --exp--> US$

``final_model.joblib`` is the whole sklearn Pipeline from Stage 7 (``prep`` + ``model``), so the learned
preprocessing (imputation, rare-level grouping, target encoding, amenity encoding, correlation filter) is
exactly the one fitted on the training split. Nothing is refitted here.
"""
from __future__ import annotations

import difflib
import json
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from src import preprocessing as pp

from .schemas import ListingInput

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "final_model.joblib"
METADATA_PATH = ROOT / "models" / "final_model_metadata.json"
REFERENCE_PATH = ROOT / "models" / "backend_reference.json"

CANCELLATION_NAMES = {0.0: "flexible", 1.0: "moderate", 2.0: "strict"}


@dataclass
class FieldError:
    field: str
    message: str


class InputError(Exception):
    """Raised when one or more inputs are invalid. Carries every problem found, not only the first."""

    def __init__(self, errors: list[FieldError]):
        self.errors = errors
        super().__init__("; ".join(f"{e.field}: {e.message}" for e in errors))


class PricePredictor:
    def __init__(self, model_path: Path = MODEL_PATH, metadata_path: Path = METADATA_PATH,
                 reference_path: Path = REFERENCE_PATH):
        for p in (model_path, metadata_path, reference_path):
            if not Path(p).exists():
                hint = " (run: py -m backend.build_reference)" if Path(p) == REFERENCE_PATH else ""
                raise FileNotFoundError(f"required file not found: {p}{hint}")
        self.model = joblib.load(model_path)
        self.metadata = json.loads(Path(metadata_path).read_text(encoding="utf-8"))
        self.reference = json.loads(Path(reference_path).read_text(encoding="utf-8"))
        if "prep" not in getattr(self.model, "named_steps", {}):
            raise TypeError("final_model.joblib must be the Stage 7 Pipeline with a 'prep' step")

        # values the fitted pipeline uses when an optional input is missing (learned on the training split)
        columns = self.model.named_steps["prep"].named_steps["columns"].named_transformers_
        num = columns["num"].named_steps["impute"]
        binary = columns["bin"]
        self.fill_values = {**dict(zip(num.feature_names_in_, num.statistics_)),
                            **dict(zip(binary.feature_names_in_, binary.statistics_))}
        self._location_step = self.model.named_steps["prep"].named_steps["location"]

        # case-insensitive lookups: user spelling -> canonical spelling used in training
        cats = self.reference["categories"]
        self._lookup = {field: {v.lower(): v for v in values} for field, values in cats.items()}
        self._nbhd_lookup = {city: {n.lower(): n for n in names}
                             for city, names in self.reference["neighbourhoods"].items()}
        self._amenity_vocab = {a["name"] for a in self.reference["amenities"]}
        self._amenity_lookup = {a.lower(): a for a in self._amenity_vocab | set(pp.AMENITY_SYNONYMS)}

    # ------------------------------------------------------------------ public API
    def options(self) -> dict:
        """Everything a frontend needs to build the input form."""
        ref = self.reference
        return {"required_fields": ["city", "room_type", "property_type", "accommodates"],
                "optional_fields": [f for f in self.metadata["form_fields"]
                                    if f not in ("city", "room_type", "property_type", "accommodates")],
                "categories": ref["categories"], "neighbourhoods": ref["neighbourhoods"],
                "city_bounds": ref["city_bounds"], "numeric_ranges": ref["numeric_ranges"],
                "amenities": ref["amenities"]}

    def model_info(self) -> dict:
        m = self.metadata
        return {"model": m["model"], "target": m["target"], "feature_set": m["feature_set"],
                "form_fields": m["form_fields"], "hyperparameters": m["hyperparameters"],
                "test_metrics": m["test_metrics"], "train_rows": m["train_rows"], "test_rows": m["test_rows"],
                "trained_on": m["trained_on"], "versions": m["versions"],
                "price_ranges": self.reference["price_ranges"]}

    def predict(self, listing: ListingInput) -> dict:
        return self.predict_many([listing])[0]

    def predict_many(self, listings: list[ListingInput]) -> list[dict]:
        errors, rows, warnings = [], [], []
        for i, listing in enumerate(listings):
            prefix = f"listings[{i}]." if len(listings) > 1 else ""
            try:
                row, warn = self.validate(listing)
                rows.append(row)
                warnings.append(warn)
            except InputError as e:
                errors += [FieldError(prefix + err.field, err.message) for err in e.errors]
        if errors:
            raise InputError(errors)

        raw = pd.DataFrame(rows)
        clean = pp.clean_and_engineer(raw)                      # same rule-based step as training
        located = self._location_step.transform(clean)          # only used to report inferred location
        log_price = self.model.predict(clean)                   # learned preprocessing + XGBoost

        return [self._result(rows[i], warnings[i], clean.iloc[i], located.iloc[i], float(log_price[i]))
                for i in range(len(rows))]

    # ------------------------------------------------------------------ validation
    def validate(self, listing: ListingInput) -> tuple[dict, list[str]]:
        """Checks values against the training data and returns (raw listing row, warnings)."""
        errors: list[FieldError] = []
        warnings: list[str] = []
        row = listing.model_dump()

        for field in ["city", "room_type", "property_type", "bed_type", "cancellation_policy"]:
            if row[field] is None:
                continue
            canonical = self._lookup[field].get(row[field].lower())
            if canonical is None:
                errors.append(FieldError(field, self._unknown_msg(row[field], self.reference["categories"][field])))
            row[field] = canonical

        for field, rng in self.reference["numeric_ranges"].items():
            v = row[field]
            if v is not None and not rng["min"] <= v <= rng["max"]:
                errors.append(FieldError(field, f"must be between {rng['min']:g} and {rng['max']:g} (got {v:g})"))
        if row["bathrooms"] is not None and (row["bathrooms"] * 2) % 1:
            errors.append(FieldError("bathrooms", "must be a whole or half number, e.g. 1 or 1.5"))

        city = row["city"]
        if city is not None:
            if row["neighbourhood"] is not None:
                canonical = self._nbhd_lookup[city].get(row["neighbourhood"].lower())
                if canonical is None:
                    errors.append(FieldError("neighbourhood", self._neighbourhood_msg(row["neighbourhood"], city)))
                row["neighbourhood"] = canonical
            if row["latitude"] is not None:
                b = self.reference["city_bounds"][city]
                if not (b["lat_min"] <= row["latitude"] <= b["lat_max"] and b["lon_min"] <= row["longitude"] <= b["lon_max"]):
                    errors.append(FieldError("latitude/longitude",
                                             f"({row['latitude']}, {row['longitude']}) is outside {city} "
                                             f"(latitude {b['lat_min']} to {b['lat_max']}, longitude {b['lon_min']} to {b['lon_max']})"))
        if errors:
            raise InputError(errors)

        row["amenities"], unknown = self._clean_amenities(row["amenities"])
        if unknown:
            warnings.append(f"Ignored {len(unknown)} unrecognised amenit{'y' if len(unknown) == 1 else 'ies'}: "
                            f"{', '.join(unknown)} (see GET /options for the accepted names)")
        if not row["amenities"]:
            warnings.append("No amenities given: the price assumes the listing offers none, which lowers it.")
        if row["neighbourhood"] is None and row["latitude"] is None:
            warnings.append("No neighbourhood or coordinates given: the location is estimated from the city "
                            "as a whole, so the price is less precise.")
        if row["bedrooms"] is not None and row["bedrooms"] > row["accommodates"]:
            warnings.append("More bedrooms than guests is unusual: please check the numbers.")
        if row["beds"] is not None and row["beds"] > 2 * row["accommodates"]:
            warnings.append("More than two beds per guest is unusual: please check the numbers.")
        return row, warnings

    def _clean_amenities(self, values: list[str] | None) -> tuple[list[str], list[str]]:
        """Maps user spellings/synonyms to the training vocabulary. Unknown names are dropped and reported,
        so a typo cannot inflate `amenity_count`."""
        known, unknown = set(), []
        for v in values or []:
            name = self._amenity_lookup.get(v.strip().lower())
            tokens = pp.parse_amenities([name]) if name else []
            if name is None or not set(tokens) <= self._amenity_vocab:
                unknown.append(v)
            known.update(tokens)
        return sorted(known), unknown

    @staticmethod
    def _unknown_msg(value: str, allowed: list[str]) -> str:
        if len(allowed) <= 6:
            return f"'{value}' is not recognised; choose one of: {', '.join(allowed)}"
        close = difflib.get_close_matches(value, allowed, n=3, cutoff=0.6)
        hint = f" Did you mean: {', '.join(close)}?" if close else " See GET /options for the full list."
        return f"'{value}' is not recognised.{hint}"

    def _neighbourhood_msg(self, value: str, city: str) -> str:
        other = [c for c, names in self._nbhd_lookup.items() if c != city and value.lower() in names]
        if other:
            return f"'{value}' is in {', '.join(other)}, not {city}"
        close = difflib.get_close_matches(value, self.reference["neighbourhoods"][city], n=3, cutoff=0.6)
        hint = f" Did you mean: {', '.join(close)}?" if close else ""
        return (f"'{value}' is not a known neighbourhood of {city}.{hint} "
                "Leave it out to have it inferred from latitude/longitude.")

    # ------------------------------------------------------------------ result
    def _result(self, row: dict, warnings: list[str], clean: pd.Series, located: pd.Series, log_price: float) -> dict:
        price = float(np.exp(log_price))
        ranges = self.reference["price_ranges"]
        test = self.metadata["test_metrics"]
        return {
            "predicted_price": round(price, 2),
            "currency": "USD",
            "unit": "per night",
            "likely_range": self._range(price, ranges["likely"]),
            "wide_range": self._range(price, ranges["wide"]),
            "log_price": round(log_price, 4),
            "filled_in": self._filled_in(row, clean, located),
            "warnings": warnings,
            "input": row,
            "model": {"name": self.metadata["model"], "trained_on": self.metadata["trained_on"],
                      "test_r2": round(test["R²"], 3), "test_median_abs_error_usd": round(test["MedAE ($)"], 2)},
        }

    @staticmethod
    def _range(price: float, r: dict) -> dict:
        return {"low": round(price * r["low_ratio"], 2), "high": round(price * r["high_ratio"], 2),
                "coverage": r["coverage"]}

    def _filled_in(self, row: dict, clean: pd.Series, located: pd.Series) -> list[dict]:
        """Lists the optional inputs that were missing and the value the trained pipeline used instead."""
        f, out = self.fill_values, []

        def add(field, value, reason):
            out.append({"field": field, "value": value, "reason": reason})

        if row["latitude"] is None:
            source = f"the median location of {row['neighbourhood']}" if row["neighbourhood"] else f"the median location of {row['city']}"
            add("latitude", round(float(located["latitude"]), 5), source)
            add("longitude", round(float(located["longitude"]), 5), source)
        if row["neighbourhood"] is None:
            where = "the given coordinates" if row["latitude"] is not None else "the city's median location"
            add("neighbourhood", str(located["neighbourhood"]).split(" | ", 1)[-1],
                f"the most common neighbourhood among the 5 training listings nearest to {where}")
        for field in ["bathrooms", "bedrooms", "beds"]:
            if pd.isna(clean[field]):
                add(field, float(f[field]), "the median of the training listings")
        if row["bed_type"] is None:
            add("bed_type", "Real Bed" if f["is_real_bed"] == 1 else "not a real bed", "the most common bed type")
        if row["cancellation_policy"] is None:
            add("cancellation_policy", CANCELLATION_NAMES[float(f["cancellation_ordinal"])], "the median policy")
        for field in ["cleaning_fee", "instant_bookable"]:
            if row[field] is None:
                add(field, bool(f[field]), "the most common answer in the training listings")
        return out
