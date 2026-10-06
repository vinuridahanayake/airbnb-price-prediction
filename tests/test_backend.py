"""Stage 9 backend tests.   Run from the project folder:   py -m pytest tests -q

1. Consistency: the API returns exactly the Stage 7 pipeline's prediction for real held-out listings.
2. Valid requests return a clear result (price, ranges, filled-in fields, warnings).
3. Invalid or missing inputs are rejected with a 422 and a message per field.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.app import app
from src import preprocessing as pp

ROOT = Path(__file__).resolve().parents[1]
RAW_CSV = ROOT / "Airbnb_Data.csv"

EXAMPLE = {"city": "NYC", "neighbourhood": "Williamsburg", "latitude": 40.7081, "longitude": -73.9571,
           "room_type": "Entire home/apt", "property_type": "Apartment", "accommodates": 4,
           "bathrooms": 1.0, "bedrooms": 2, "beds": 2, "bed_type": "Real Bed",
           "cancellation_policy": "moderate", "cleaning_fee": True, "instant_bookable": False,
           "amenities": ["TV", "Wireless Internet", "Kitchen", "Heating", "Essentials"]}
MINIMAL = {"city": "LA", "room_type": "Private room", "property_type": "House", "accommodates": 2}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def errors(response) -> dict[str, str]:
    assert response.status_code == 422, response.text
    body = response.json()
    assert body["error"] == "invalid_input"
    return {d["field"]: d["message"] for d in body["details"]}


# ------------------------------------------------------------------ 1. same pipeline as model development
def test_matches_stage7_pipeline_on_test_listings(client):
    """Raw test-split listings sent through the API give the same price as the saved pipeline."""
    if not RAW_CSV.exists():
        pytest.skip("Airbnb_Data.csv not unzipped")
    test_ids = pd.read_csv(ROOT / "data" / "processed" / "split_ids.csv").query("split == 'test'")["id"]
    raw = pd.read_csv(RAW_CSV)
    raw = raw[raw["id"].isin(test_ids)].sample(200, random_state=0)
    # API rules stricter than the raw data: 0 bathrooms/beds are rejected (the pipeline treats them as unknown)
    raw = raw[(raw["bathrooms"] != 0) & (raw["beds"] != 0)]

    model = client.app.state.predictor.model
    expected = np.exp(model.predict(pp.clean_and_engineer(raw)))

    payload = []
    for _, r in raw.iterrows():
        item = {f: (None if pd.isna(r[f]) else r[f]) for f in client.app.state.predictor.metadata["form_fields"]}
        item["amenities"] = pp.parse_amenities(r["amenities"])
        item["cleaning_fee"] = bool(r["cleaning_fee"])
        item["instant_bookable"] = r["instant_bookable"] == "t"
        for f in ["accommodates", "bedrooms", "beds"]:
            item[f] = None if item[f] is None else int(item[f])
        payload.append(item)

    got = []
    for start in range(0, len(payload), 100):
        res = client.post("/predict/batch", json={"listings": payload[start:start + 100]})
        assert res.status_code == 200, res.text
        got += [p["predicted_price"] for p in res.json()["predictions"]]
    np.testing.assert_allclose(got, expected, atol=0.006)          # API rounds to cents


def test_preprocessing_fix_keeps_saved_test_predictions(client):
    """The dtype fix in clean_and_engineer must not change any prediction on the saved test split."""
    if not RAW_CSV.exists():
        pytest.skip("Airbnb_Data.csv not unzipped")
    test = pd.read_pickle(ROOT / "data" / "processed" / "test_clean.pkl")
    raw = pd.read_csv(RAW_CSV).loc[test.index]
    model = client.app.state.predictor.model
    np.testing.assert_allclose(model.predict(pp.clean_and_engineer(raw)),
                               model.predict(test.drop(columns=[pp.TARGET])), rtol=0, atol=1e-6)


# ------------------------------------------------------------------ 2. valid requests
def test_health_and_info(client):
    assert client.get("/health").json()["status"] == "ok"
    info = client.get("/model-info").json()
    assert info["model"] == "XGBoost" and "R²" in info["test_metrics"]
    opts = client.get("/options").json()
    assert "Williamsburg" in opts["neighbourhoods"]["NYC"]
    assert opts["required_fields"] == ["city", "room_type", "property_type", "accommodates"]


def test_full_listing(client):
    res = client.post("/predict", json=EXAMPLE)
    assert res.status_code == 200
    body = res.json()
    assert 20 < body["predicted_price"] < 1000
    assert body["likely_range"]["low"] < body["predicted_price"] < body["likely_range"]["high"]
    assert body["wide_range"]["low"] < body["likely_range"]["low"]
    assert body["predicted_price"] == pytest.approx(np.exp(body["log_price"]), abs=0.01)
    assert body["filled_in"] == [] and body["warnings"] == []
    assert "Internet" in body["input"]["amenities"]                  # synonym merged as in training


def test_minimal_listing_reports_filled_in_fields(client):
    res = client.post("/predict", json=MINIMAL)
    assert res.status_code == 200
    body = res.json()
    filled = {f["field"] for f in body["filled_in"]}
    assert {"latitude", "longitude", "neighbourhood", "bathrooms", "bedrooms", "beds",
            "bed_type", "cancellation_policy", "cleaning_fee", "instant_bookable"} <= filled
    assert any("location is estimated" in w for w in body["warnings"])
    assert any("No amenities" in w for w in body["warnings"])


def test_neighbourhood_inferred_from_coordinates(client):
    res = client.post("/predict", json={**MINIMAL, "city": "NYC", "latitude": 40.7081, "longitude": -73.9571})
    filled = {f["field"]: f["value"] for f in res.json()["filled_in"]}
    assert filled["neighbourhood"] == "Williamsburg"


def test_case_insensitive_categories(client):
    a = client.post("/predict", json=EXAMPLE).json()
    b = client.post("/predict", json={**EXAMPLE, "city": "nyc", "room_type": "entire home/apt",
                                      "neighbourhood": "williamsburg", "amenities": ["tv", "kitchen", "heating",
                                                                                    "essentials", "internet"]}).json()
    assert a["predicted_price"] == b["predicted_price"]


def test_more_space_costs_more(client):
    small = client.post("/predict", json={**EXAMPLE, "accommodates": 2, "bedrooms": 1, "beds": 1}).json()
    large = client.post("/predict", json={**EXAMPLE, "accommodates": 8, "bedrooms": 4, "beds": 4, "bathrooms": 2}).json()
    assert large["predicted_price"] > small["predicted_price"]


def test_unknown_amenity_is_ignored_with_warning(client):
    a = client.post("/predict", json=EXAMPLE).json()
    b = client.post("/predict", json={**EXAMPLE, "amenities": EXAMPLE["amenities"] + ["Jacuzzi on the moon"]}).json()
    assert a["predicted_price"] == b["predicted_price"]                # a typo must not change amenity_count
    assert any("Jacuzzi on the moon" in w for w in b["warnings"])


# ------------------------------------------------------------------ 3. invalid / missing inputs
@pytest.mark.parametrize("field", ["city", "room_type", "property_type", "accommodates"])
def test_required_field_missing(client, field):
    payload = {k: v for k, v in EXAMPLE.items() if k != field}
    assert errors(client.post("/predict", json=payload))[field] == "this field is required"


@pytest.mark.parametrize("field,value,fragment", [
    ("city", "Paris", "choose one of"),
    ("room_type", "Whole house", "choose one of"),
    ("property_type", "Apartmnt", "Did you mean: Apartment"),
    ("bed_type", "Waterbed", "not recognised"),
    ("cancellation_policy", "none", "not recognised"),
    ("accommodates", 0, "between 1 and 16"),
    ("accommodates", 40, "between 1 and 16"),
    ("bathrooms", 0, "between 0.5 and 8"),
    ("bathrooms", 1.3, "whole or half"),
    ("bedrooms", -1, "between 0 and 10"),
    ("beds", 0, "between 1 and 18"),
    ("neighbourhood", "Wiliamsburg", "Did you mean: Williamsburg"),
])
def test_invalid_values(client, field, value, fragment):
    assert fragment in errors(client.post("/predict", json={**EXAMPLE, field: value}))[field]


@pytest.mark.parametrize("field,value", [("accommodates", "four"), ("cleaning_fee", "maybe"),
                                         ("amenities", "TV, Kitchen"), ("latitude", 200)])
def test_wrong_types(client, field, value):
    assert field in errors(client.post("/predict", json={**EXAMPLE, field: value}))


def test_neighbourhood_in_other_city(client):
    msg = errors(client.post("/predict", json={**EXAMPLE, "city": "LA", "latitude": None, "longitude": None}))
    assert msg["neighbourhood"] == "'Williamsburg' is in NYC, not LA"


def test_coordinates_outside_city(client):
    msg = errors(client.post("/predict", json={**EXAMPLE, "latitude": 34.05, "longitude": -118.24}))
    assert "outside NYC" in msg["latitude/longitude"]


def test_only_one_coordinate(client):
    payload = {**EXAMPLE, "longitude": None}
    assert "together" in errors(client.post("/predict", json=payload))["body"]


def test_unknown_field(client):
    assert "unknown field" in errors(client.post("/predict", json={**EXAMPLE, "bedroom": 2}))["bedroom"]


def test_all_problems_reported_at_once(client):
    msg = errors(client.post("/predict", json={**EXAMPLE, "city": "NYC", "property_type": "Igloo",
                                               "accommodates": 50, "bathrooms": 1.2}))
    assert {"property_type", "accommodates", "bathrooms"} <= set(msg)


def test_bad_json_and_empty_body(client):
    bad = client.post("/predict", content=b"{not json", headers={"content-type": "application/json"})
    assert errors(bad) == {"body": "the request body is not valid JSON"}
    assert "body" in errors(client.post("/predict"))


def test_batch_reports_item_index(client):
    msg = errors(client.post("/predict/batch", json={"listings": [EXAMPLE, {**EXAMPLE, "city": "Paris"}]}))
    assert "listings[1].city" in msg
    assert "listings" in errors(client.post("/predict/batch", json={"listings": []}))
