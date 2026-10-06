"""Preprocessing & feature engineering for the Airbnb listing-price model (Stage 4).

The work is split into two layers on purpose, to prevent data leakage:

1. ``clean_and_engineer(df)`` - row-wise, rule-based steps. They only use fixed domain
   constants (snapshot date, city-centre coordinates, amenity synonym map) and never
   statistics computed from the data, so they are safe to run before the train/test
   split, and they run identically on a single listing at prediction time (backend).
2. ``build_preprocessor(kind, feature_set)`` - an sklearn ``Pipeline`` of *learned* steps
   (location imputation, median/mode imputation, rare-level grouping, amenity vocabulary,
   target encoding, winsorising, scaling, correlation filter). It is fitted on the
   training split only; inside cross-validation it is refitted on every training fold.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.model_selection import KFold
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler, TargetEncoder

# --------------------------------------------------------------------------- constants
TARGET = "log_price"
SNAPSHOT_DATE = pd.Timestamp("2017-10-05")      # latest date in the dataset (EDA §13)
MIN_VALID_PRICE = 10.0                           # below this the price is a data-entry error (EDA §5)
RANDOM_STATE = 42

CITY_CENTRES = {                                 # (lat, lon) of each city's main centre
    "NYC": (40.7580, -73.9855),                  # Times Square
    "LA": (34.0522, -118.2437),                  # Downtown LA
    "SF": (37.7880, -122.4075),                  # Union Square
    "DC": (38.8977, -77.0365),                   # White House
    "Chicago": (41.8837, -87.6325),              # The Loop
    "Boston": (42.3551, -71.0656),               # Boston Common
}

# flexible < moderate < strict; the two super_strict levels (0.2% of rows) are merged into strict
CANCELLATION_ORDER = {"flexible": 0, "moderate": 1, "strict": 2, "super_strict_30": 2, "super_strict_60": 2}

# Amenity tokens that mean the same thing (EDA §12). A value of [] removes the token.
AMENITY_SYNONYMS = {
    "Wireless Internet": ["Internet"],
    "Ethernet connection": ["Internet"],
    "Pocket wifi": ["Internet"],
    "Elevator in building": ["Elevator"],        # renamed between scrapes: the two never co-occur
    "Smartlock": ["Smart lock"],
    "Doorman Entry": ["Doorman"],
    "Firm matress": ["Firm mattress"],
    "Washer / Dryer": ["Washer", "Dryer"],
    "Path to entrance lit at night": ["Well-lit path to entrance"],
    "Flat": [],                                  # "Flat, smooth pathway..." was split on its comma
    "smooth pathway to front door": ["Flat smooth pathway to front door"],
    "Wide clearance to shower and toilet": ["Wide clearance to shower & toilet"],
    "Grab-rails for shower and toilet": ["Fixed grab bars for shower & toilet"],
    "Other": [],                                 # meaningless placeholder
}

# --------------------------------------------------------------------------- feature groups
# "listing": what a host can type into the "Price Your Listing" form -> the deployable model.
# "full":    adds host profile + booking-history features that a NEW listing does not have
#            (leakage-sensitive, EDA §16) - used only to measure what they are worth.
LISTING_NUMERIC = ["accommodates", "bathrooms", "bedrooms", "beds",
                   "guests_per_bedroom", "beds_per_guest", "guests_per_bathroom",
                   "amenity_count", "cancellation_ordinal", "latitude", "longitude", "dist_centre_km"]
# amenities_empty and host_has_profile_pic are engineered/parsed but removed by the variance filter (>99% one value)
LISTING_BINARY = ["cleaning_fee", "instant_bookable", "is_studio", "is_real_bed"]
LISTING_ONEHOT = ["room_type", "city", "property_type"]
TARGET_ENCODED = ["neighbourhood"]
AMENITY_COLUMN = ["amenity_list"]

HOST_NUMERIC = ["host_tenure_yrs"]
HOST_BINARY = ["host_identity_verified"]
HISTORY_NUMERIC = ["log_number_of_reviews", "review_scores_rating", "host_response_rate",
                   "listing_age_yrs", "days_since_last_review"]
HISTORY_BINARY = ["has_reviews", "review_score_missing", "response_rate_missing"]

FEATURE_SETS = {
    "listing": {"numeric": LISTING_NUMERIC, "binary": LISTING_BINARY},
    "full": {"numeric": LISTING_NUMERIC + HOST_NUMERIC + HISTORY_NUMERIC,
             "binary": LISTING_BINARY + HOST_BINARY + HISTORY_BINARY},
}


# --------------------------------------------------------------------------- layer 1: rules
def _col(df: pd.DataFrame, name: str) -> pd.Series:
    """Column if present, else all-NaN (lets the backend send only the form fields)."""
    return df[name] if name in df else pd.Series(np.nan, index=df.index, dtype="float64")


def _to_flag(s: pd.Series) -> pd.Series:
    """'t'/'f', True/False, 'true'/'false' or 1/0  ->  1.0 / 0.0 (unknown -> NaN)."""
    mapping = {"t": 1.0, "f": 0.0, "true": 1.0, "false": 0.0, True: 1.0, False: 0.0}
    return s.map(lambda v: mapping.get(v.strip().lower() if isinstance(v, str) else v, np.nan)).astype(float)


def parse_amenities(value) -> list[str]:
    """'{TV,"Wireless Internet",...}' (or a list) -> sorted, de-junked, synonym-merged list."""
    if isinstance(value, (list, tuple, set)):
        items = list(value)
    elif isinstance(value, str):
        items = value.strip().strip("{}").split(",")
    else:
        return []
    out = set()
    for raw in items:
        token = str(raw).strip().strip('"').strip()
        if not token or token.startswith("translation missing"):
            continue
        out.update(AMENITY_SYNONYMS.get(token, [token]))
    return sorted(out)


def haversine_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = (np.radians(np.asarray(v, dtype=float)) for v in (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 6371.0 * 2 * np.arcsin(np.sqrt(a))


def remove_invalid_rows(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Drop rows whose target is a data-entry error (price < $10). Returns (kept, removed)."""
    invalid = np.exp(df[TARGET]) < MIN_VALID_PRICE
    return df.loc[~invalid].copy(), df.loc[invalid].copy()


def clean_and_engineer(df: pd.DataFrame) -> pd.DataFrame:
    """Type fixes, invalid-value handling and rule-based feature engineering (no learning)."""
    out = pd.DataFrame(index=df.index)

    # categorical: stored as plain object dtype so sklearn encoders treat NaN consistently
    for c in ["city", "room_type", "property_type", "bed_type"]:
        out[c] = _col(df, c).astype(object)
    nbhd = _col(df, "neighbourhood").astype(object)
    # 19 neighbourhood names exist in more than one city -> make them unique per city
    # dtype=object: if every value is missing (e.g. one backend request without a neighbourhood) pandas
    # would otherwise make the column float and the LocationImputer could not write the inferred name into it
    out["neighbourhood"] = pd.Series([np.nan if pd.isna(n) else f"{c} | {n}" for c, n in zip(out["city"], nbhd)],
                                     index=df.index, dtype=object)

    # numeric
    for c in ["accommodates", "bathrooms", "bedrooms", "beds", "latitude", "longitude",
              "number_of_reviews", "review_scores_rating"]:
        out[c] = pd.to_numeric(_col(df, c), errors="coerce")
    out.loc[out["bathrooms"] == 0, "bathrooms"] = np.nan    # 0 bathrooms is implausible -> unknown
    out.loc[out["beds"] == 0, "beds"] = np.nan              # 0 beds is implausible -> unknown
    out["host_response_rate"] = pd.to_numeric(
        _col(df, "host_response_rate").astype(str).str.rstrip("%"), errors="coerce")

    # booleans
    for c in ["cleaning_fee", "instant_bookable", "host_identity_verified", "host_has_profile_pic"]:
        out[c] = _to_flag(_col(df, c))

    # policy & bed
    out["cancellation_ordinal"] = _col(df, "cancellation_policy").map(CANCELLATION_ORDER).astype(float)
    out["is_real_bed"] = np.where(out["bed_type"].isna(), np.nan, (out["bed_type"] == "Real Bed").astype(float))

    # size / capacity ratios (bedrooms = 0 is a studio: count it as one room)
    out["is_studio"] = (out["bedrooms"] == 0).astype(float)
    rooms = out["bedrooms"].clip(lower=1)
    out["guests_per_bedroom"] = out["accommodates"] / rooms
    out["beds_per_guest"] = out["beds"] / out["accommodates"]
    out["guests_per_bathroom"] = out["accommodates"] / out["bathrooms"]

    # amenities
    out["amenity_list"] = _col(df, "amenities").map(parse_amenities)
    out["amenity_count"] = out["amenity_list"].str.len().astype(float)
    out["amenities_empty"] = (out["amenity_count"] == 0).astype(float)

    # dates -> durations measured from the snapshot date
    def years_since(col):
        return (SNAPSHOT_DATE - pd.to_datetime(_col(df, col), errors="coerce")).dt.days / 365.25
    out["host_tenure_yrs"] = years_since("host_since").clip(lower=0)
    out["listing_age_yrs"] = years_since("first_review").clip(lower=0)
    out["days_since_last_review"] = (years_since("last_review") * 365.25).clip(lower=0)

    # booking-history features + missing-value indicators (missingness is informative, EDA §3)
    out["has_reviews"] = (out["number_of_reviews"] > 0).astype(float)
    out["log_number_of_reviews"] = np.log1p(out["number_of_reviews"])
    out["review_score_missing"] = out["review_scores_rating"].isna().astype(float)
    out["response_rate_missing"] = out["host_response_rate"].isna().astype(float)
    return out


# --------------------------------------------------------------------------- layer 2: learned steps
class LocationImputer(BaseEstimator, TransformerMixin):
    """Fills missing location fields from training data and adds ``dist_centre_km``.

    * missing lat/lon       -> median lat/lon of the listing's neighbourhood (else of its city)
    * missing neighbourhood -> majority label of the k nearest *training* listings (lat/lon)
    The KNN uses only coordinates and neighbourhood labels, never the target.
    """

    def __init__(self, n_neighbors: int = 5):
        self.n_neighbors = n_neighbors

    def fit(self, X, y=None):
        self.feature_names_in_ = np.asarray(X.columns, dtype=object)
        self.city_centroid_ = X.groupby("city")[["latitude", "longitude"]].median()
        self.nbhd_centroid_ = X.groupby("neighbourhood")[["latitude", "longitude"]].median()
        known = X.dropna(subset=["latitude", "longitude", "neighbourhood"])
        self.knn_ = KNeighborsClassifier(n_neighbors=self.n_neighbors).fit(
            known[["latitude", "longitude"]].to_numpy(), known["neighbourhood"].to_numpy())
        return self

    def transform(self, X):
        X = X.copy()
        for coord in ["latitude", "longitude"]:
            miss = X[coord].isna()
            if miss.any():
                X.loc[miss, coord] = X.loc[miss, "neighbourhood"].map(self.nbhd_centroid_[coord])
                miss = X[coord].isna()
                X.loc[miss, coord] = X.loc[miss, "city"].map(self.city_centroid_[coord])
        miss = X["neighbourhood"].isna() & X[["latitude", "longitude"]].notna().all(axis=1)
        if miss.any():
            X.loc[miss, "neighbourhood"] = self.knn_.predict(X.loc[miss, ["latitude", "longitude"]].to_numpy())
        centre = X["city"].map(CITY_CENTRES)
        X["dist_centre_km"] = haversine_km(X["latitude"], X["longitude"],
                                           centre.map(lambda c: c[0] if isinstance(c, tuple) else np.nan),
                                           centre.map(lambda c: c[1] if isinstance(c, tuple) else np.nan))
        return X

    def get_feature_names_out(self, input_features=None):
        return np.append(self.feature_names_in_, "dist_centre_km")


class RareCategoryGrouper(BaseEstimator, TransformerMixin):
    """Replaces levels seen fewer than ``min_count`` times in training (and unseen levels) by 'Other'."""

    def __init__(self, min_count: int = 100):
        self.min_count = min_count

    def fit(self, X, y=None):
        X = pd.DataFrame(X)
        self.feature_names_in_ = np.asarray(X.columns, dtype=object)
        self.keep_ = {c: set(vc[vc >= self.min_count].index) for c, vc in
                      ((c, X[c].value_counts()) for c in X.columns)}
        return self

    def transform(self, X):
        X = pd.DataFrame(X).copy()
        for c in X.columns:
            X[c] = X[c].where(X[c].isin(self.keep_[c]), "Other").astype(object)
        return X

    def get_feature_names_out(self, input_features=None):
        return self.feature_names_in_


class AmenityEncoder(BaseEstimator, TransformerMixin):
    """Multi-hot encodes the amenity list, keeping amenities present in >= ``min_prevalence`` of training rows."""

    def __init__(self, min_prevalence: float = 0.02):
        self.min_prevalence = min_prevalence

    def fit(self, X, y=None):
        lists = pd.DataFrame(X).iloc[:, 0]
        prevalence = lists.explode().value_counts() / len(lists)
        self.prevalence_ = prevalence
        self.vocabulary_ = sorted(prevalence[prevalence >= self.min_prevalence].index)
        return self

    def transform(self, X):
        lists = pd.DataFrame(X).iloc[:, 0]
        sets = lists.map(lambda v: set(v) if isinstance(v, (list, tuple, set)) else set())
        data = {f"amen_{self._slug(a)}": sets.map(lambda s, a=a: float(a in s)) for a in self.vocabulary_}
        return pd.DataFrame(data, index=lists.index)

    @staticmethod
    def _slug(name: str) -> str:
        return "".join(ch if ch.isalnum() else "_" for ch in name.lower()).strip("_")

    def get_feature_names_out(self, input_features=None):
        return np.array([f"amen_{self._slug(a)}" for a in self.vocabulary_], dtype=object)


class Winsorizer(BaseEstimator, TransformerMixin):
    """Clips each column to its training [lower, upper] quantiles (used for linear models only)."""

    def __init__(self, lower: float = 0.005, upper: float = 0.995):
        self.lower = lower
        self.upper = upper

    def fit(self, X, y=None):
        X = pd.DataFrame(X)
        self.feature_names_in_ = np.asarray(X.columns, dtype=object)
        self.lower_ = X.quantile(self.lower)
        self.upper_ = X.quantile(self.upper)
        return self

    def transform(self, X):
        X = pd.DataFrame(X, columns=self.feature_names_in_)
        return X.clip(lower=self.lower_, upper=self.upper_, axis=1)

    def get_feature_names_out(self, input_features=None):
        return self.feature_names_in_


class CorrelationFilter(BaseEstimator, TransformerMixin):
    """Drops a feature if |Pearson r| with an earlier kept feature exceeds ``threshold`` (fitted on train).

    Columns starting with a ``protect`` prefix (one-hot dummies of a category) are never dropped:
    removing one dummy would silently merge that level into the reference level.
    """

    def __init__(self, threshold: float = 0.9, protect: tuple = ("room_type_", "city_", "property_type_")):
        self.threshold = threshold
        self.protect = protect

    def fit(self, X, y=None):
        X = pd.DataFrame(X)
        corr = X.corr().abs()
        keep, dropped = [], {}
        for c in X.columns:
            partner = None if str(c).startswith(tuple(self.protect)) else                 next((k for k in keep if corr.loc[c, k] > self.threshold), None)
            if partner is None:
                keep.append(c)
            else:
                dropped[c] = (partner, float(corr.loc[c, partner]))
        self.feature_names_in_ = np.asarray(X.columns, dtype=object)
        self.keep_, self.dropped_ = keep, dropped
        return self

    def transform(self, X):
        return pd.DataFrame(X)[self.keep_]

    def get_feature_names_out(self, input_features=None):
        return np.asarray(self.keep_, dtype=object)


def build_preprocessor(kind: str = "tree", feature_set: str = "listing", rare_min_count: int = 100,
                       amenity_min_prevalence: float = 0.02, corr_threshold: float = 0.9,
                       te_smooth: float | str = 10) -> Pipeline:
    """Leakage-safe preprocessing pipeline. ``kind='linear'`` adds winsorising + scaling
    and drops one dummy per category; ``kind='tree'`` leaves numeric features unscaled.

    ``te_smooth=10`` (m-estimate) was chosen in the Stage 4 notebook: CV accuracy is the same as
    ``"auto"``, but a 1-listing neighbourhood gets only 1/11 weight on its own mean."""
    if kind not in ("tree", "linear"):
        raise ValueError("kind must be 'tree' or 'linear'")
    cols = FEATURE_SETS[feature_set]
    linear = kind == "linear"

    numeric = [("impute", SimpleImputer(strategy="median"))]
    if linear:
        numeric += [("clip", Winsorizer()), ("scale", StandardScaler())]
    categorical = Pipeline([
        ("rare", RareCategoryGrouper(min_count=rare_min_count)),
        ("onehot", OneHotEncoder(handle_unknown="ignore", drop="first" if linear else None, sparse_output=False)),
    ])
    # cross-fitted: each training row is encoded with means from the OTHER 4 folds (no self-leakage)
    target_enc = [("encode", TargetEncoder(target_type="continuous", smooth=te_smooth,
                                           cv=KFold(5, shuffle=True, random_state=RANDOM_STATE)))]
    if linear:
        target_enc.append(("scale", StandardScaler()))

    columns = ColumnTransformer([
        ("num", Pipeline(numeric), cols["numeric"]),
        ("bin", SimpleImputer(strategy="most_frequent"), cols["binary"]),
        ("cat", categorical, LISTING_ONEHOT),
        ("nbhd", Pipeline(target_enc), TARGET_ENCODED),
        ("amen", AmenityEncoder(min_prevalence=amenity_min_prevalence), AMENITY_COLUMN),
    ], remainder="drop", verbose_feature_names_out=False)

    pipe = Pipeline([
        ("location", LocationImputer()),
        ("columns", columns),
        ("corr_filter", CorrelationFilter(threshold=corr_threshold)),
    ])
    return pipe.set_output(transform="pandas")
