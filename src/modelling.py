"""Model development helpers shared by Stage 6 (03_Modelling) and Stage 7 (04_Optimisation).

Every model is wrapped together with the Stage 4 preprocessor in ONE sklearn ``Pipeline``:

    Layer-1 frame (clean_and_engineer)  ->  build_preprocessor(kind, feature_set)  ->  model

so cross-validation and hyper-parameter search refit the learned preprocessing on every
training fold (no leakage), and the saved final pipeline accepts exactly the frame that the
Stage 9 backend produces from a form submission.
"""
from __future__ import annotations

import time

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin, clone
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold
from sklearn.neighbors import KNeighborsRegressor
from sklearn.pipeline import Pipeline
from xgboost import XGBRegressor

from . import preprocessing as pp

RANDOM_STATE = pp.RANDOM_STATE
# One fixed 5-fold split of the TRAINING set, shared by every model and every search -> paired, fair comparison
CV = KFold(5, shuffle=True, random_state=RANDOM_STATE)

# name -> (preprocessing kind, family, factory). Five algorithms from four families (plus a mean baseline as a
# reference). Stage 6 settings are library defaults, except where noted inline; Stage 7 tunes them.
MODELS = {
    "Mean baseline": ("tree", "baseline", lambda: DummyRegressor(strategy="mean")),
    "Linear Regression": ("linear", "linear", lambda: LinearRegression()),
    "Ridge": ("linear", "linear", lambda: Ridge(alpha=1.0)),
    "KNN": ("linear", "instance-based", lambda: KNeighborsRegressor(n_neighbors=5, n_jobs=-1)),
    # max_features = 1/3 is Breiman's recommendation for regression forests (the default 1.0 is ~3x slower)
    "Random Forest": ("tree", "bagging ensemble", lambda: RandomForestRegressor(
        n_estimators=200, max_features=1 / 3, n_jobs=-1, random_state=RANDOM_STATE)),
    "XGBoost": ("tree", "boosting ensemble", lambda: XGBRegressor(
        tree_method="hist", n_jobs=-1, random_state=RANDOM_STATE)),
}


class ColumnDropper(BaseEstimator, TransformerMixin):
    """Removes preprocessed columns by exact name or prefix (used for Stage 7 ablation experiments)."""

    def __init__(self, columns: tuple = (), prefixes: tuple = ()):
        self.columns = columns
        self.prefixes = prefixes

    def fit(self, X, y=None):
        cols = pd.DataFrame(X).columns
        self.keep_ = [c for c in cols if c not in self.columns and not str(c).startswith(tuple(self.prefixes))]
        return self

    def transform(self, X):
        return pd.DataFrame(X)[self.keep_]

    def get_feature_names_out(self, input_features=None):
        return np.asarray(self.keep_, dtype=object)


def make_pipeline(name: str, feature_set: str = "listing", model=None, drop: dict | None = None,
                  memory=None, **prep_kwargs) -> Pipeline:
    """Preprocessor (+ optional ColumnDropper) + model, as one leakage-safe Pipeline."""
    kind, _, factory = MODELS[name]
    steps = [("prep", pp.build_preprocessor(kind, feature_set, **prep_kwargs))]
    if drop:
        steps.append(("drop", ColumnDropper(**drop)))
    steps.append(("model", model if model is not None else factory()))
    return Pipeline(steps, memory=memory)


def load_split():
    """The fixed Stage 4 split (Layer-1 output). Returns X_train, X_test, y_train, y_test."""
    train = pd.read_pickle("data/processed/train_clean.pkl")
    test = pd.read_pickle("data/processed/test_clean.pkl")
    return (train.drop(columns=pp.TARGET), test.drop(columns=pp.TARGET),
            train[pp.TARGET], test[pp.TARGET])


def regression_metrics(y_true, y_pred) -> dict:
    """Metrics on the modelling scale (log) and on the host's scale (US$ per night).

    exp(predicted log price) estimates the *median* price for that kind of listing, which is the
    natural "typical price" recommendation for a host.
    """
    y_true, y_pred = np.asarray(y_true, dtype=float), np.asarray(y_pred, dtype=float)
    price, price_hat = np.exp(y_true), np.exp(y_pred)
    ratio_err = np.abs(price_hat / price - 1)
    return {
        "RMSE (log)": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "MAE (log)": float(mean_absolute_error(y_true, y_pred)),
        "R²": float(r2_score(y_true, y_pred)),
        "MAE ($)": float(np.mean(np.abs(price_hat - price))),
        "MedAE ($)": float(np.median(np.abs(price_hat - price))),
        "MAPE (%)": float(100 * ratio_err.mean()),
        "within ±25% (%)": float(100 * (ratio_err <= 0.25).mean()),
    }


def cross_validate_model(pipe: Pipeline, X: pd.DataFrame, y: pd.Series, cv=CV):
    """Fits a fresh clone of ``pipe`` on each training fold and scores the held-out fold.

    Returns (per-fold table, out-of-fold predictions). Train-fold RMSE/R² are recorded too,
    so over-fitting (train >> validation) is visible.
    """
    oof = pd.Series(np.nan, index=y.index, name="oof_pred")
    rows = []
    for fold, (tr, va) in enumerate(cv.split(X, y), start=1):
        est = clone(pipe)
        t0 = time.perf_counter()
        est.fit(X.iloc[tr], y.iloc[tr])
        fit_s = time.perf_counter() - t0
        t0 = time.perf_counter()
        pred = est.predict(X.iloc[va])
        predict_s = time.perf_counter() - t0
        train_pred = est.predict(X.iloc[tr])
        oof.iloc[va] = pred
        rows.append({"fold": fold, **regression_metrics(y.iloc[va], pred),
                     "train RMSE (log)": float(np.sqrt(mean_squared_error(y.iloc[tr], train_pred))),
                     "train R²": float(r2_score(y.iloc[tr], train_pred)),
                     "fit time (s)": fit_s, "predict time (s)": predict_s})
    return pd.DataFrame(rows), oof


def summarise_folds(folds: pd.DataFrame) -> pd.Series:
    """Mean of every metric across folds, plus the fold-to-fold std of the validation RMSE."""
    s = folds.drop(columns="fold").mean()
    s["RMSE std"] = folds["RMSE (log)"].std()
    return s
