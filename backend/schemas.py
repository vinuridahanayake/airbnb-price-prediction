"""Request / response models for the price-prediction API.

Pydantic checks the *shape* of the input (types, required fields, no unknown fields). The checks that need
the training data (valid categories, neighbourhood belongs to the city, coordinates inside the city, value
ranges) are done in ``backend.predictor`` against ``models/backend_reference.json``.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ListingInput(BaseModel):
    """What a host types into the "Price your listing" form (the model's `listing` feature set)."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, json_schema_extra={"examples": [{
        "city": "NYC", "neighbourhood": "Williamsburg", "latitude": 40.7081, "longitude": -73.9571,
        "room_type": "Entire home/apt", "property_type": "Apartment", "accommodates": 4,
        "bathrooms": 1.0, "bedrooms": 2, "beds": 2, "bed_type": "Real Bed",
        "cancellation_policy": "moderate", "cleaning_fee": True, "instant_bookable": False,
        "amenities": ["TV", "Wireless Internet", "Kitchen", "Heating", "Essentials"]}]})

    # required: the model cannot give a sensible price without these
    city: str = Field(min_length=1, description="One of the six cities in the data, e.g. NYC")
    room_type: str = Field(min_length=1, description="Entire home/apt, Private room or Shared room")
    property_type: str = Field(min_length=1, description="e.g. Apartment, House, Condominium")
    accommodates: int = Field(description="Maximum number of guests")

    # optional: filled in by the trained pipeline when missing (reported back as `filled_in`)
    neighbourhood: str | None = Field(None, description="Neighbourhood name; inferred from the coordinates if omitted")
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    bathrooms: float | None = Field(None, description="Number of bathrooms (half bathrooms allowed, e.g. 1.5)")
    bedrooms: int | None = Field(None, description="Number of bedrooms (0 = studio)")
    beds: int | None = None
    bed_type: str | None = None
    cancellation_policy: str | None = Field(None, description="flexible, moderate or strict (super_strict_* is treated as strict)")
    cleaning_fee: bool | None = Field(None, description="Does the host charge a cleaning fee?")
    instant_bookable: bool | None = None
    amenities: list[str] | None = Field(None, max_length=200, description="Amenity names, see GET /options")

    @model_validator(mode="after")
    def _coordinates_together(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be given together (or both left out)")
        return self


class BatchInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    listings: list[ListingInput] = Field(min_length=1, max_length=100)


class PriceRange(BaseModel):
    low: float
    high: float
    coverage: float = Field(description="Share of held-out test listings whose real price fell inside this range")


class FilledField(BaseModel):
    field: str
    value: float | str | bool
    reason: str


class ModelSummary(BaseModel):
    name: str
    trained_on: str
    test_r2: float
    test_median_abs_error_usd: float


class Prediction(BaseModel):
    predicted_price: float = Field(description="Suggested nightly price in US$")
    currency: str = "USD"
    unit: str = "per night"
    likely_range: PriceRange
    wide_range: PriceRange
    log_price: float = Field(description="Raw model output (natural log of the price)")
    filled_in: list[FilledField] = Field(description="Optional inputs that were missing and filled in by the trained pipeline")
    warnings: list[str]
    input: dict = Field(description="The input after cleaning (canonical spelling of categories)")
    model: ModelSummary


class BatchPrediction(BaseModel):
    count: int
    predictions: list[Prediction]


class ErrorDetail(BaseModel):
    field: str
    message: str


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: list[ErrorDetail] = []
