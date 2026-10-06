"""Stage 9 backend: a REST API that serves the final Airbnb price model.

Start it from the project folder:

    py -m uvicorn backend.app:app --port 8010 --reload

then open http://127.0.0.1:8010/docs for interactive documentation.

Endpoints
    GET  /health           is the service up and the model loaded?
    GET  /model-info       final model, hyper-parameters and test metrics
    GET  /options          valid values for every input (for building the frontend form)
    POST /predict          price for one listing
    POST /predict/batch    prices for up to 100 listings
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .predictor import InputError, PricePredictor
from .schemas import BatchInput, BatchPrediction, ErrorResponse, ListingInput, Prediction

log = logging.getLogger("airbnb_price_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # load once at start-up; if the model or reference file is missing the service refuses to start
    app.state.predictor = PricePredictor()
    log.info("model loaded: %s", app.state.predictor.metadata["model"])
    yield


app = FastAPI(
    title="Airbnb Listing Price API",
    description="Suggests a nightly price for a new Airbnb listing (IT3051 Mini Project, group Mine4Data). "
                "Uses the tuned XGBoost model and the Stage 4 preprocessing pipeline.",
    version="1.0.0",
    lifespan=lifespan,
)
# the Stage 10 frontend runs on a different port during development
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"])

ERRORS = {422: {"model": ErrorResponse, "description": "Invalid or missing input"}}


# ---------------------------------------------------------------- error handling
def _error(status: int, error: str, message: str, details: list[dict] | None = None) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": error, "message": message, "details": details or []})


@app.exception_handler(RequestValidationError)
async def _invalid_request(request: Request, exc: RequestValidationError):
    """Turns pydantic's errors into one short message per field."""
    details = []
    for err in exc.errors():
        field = ""
        for part in err["loc"][1:] if err["loc"][:1] == ("body",) else err["loc"]:
            field += f"[{part}]" if isinstance(part, int) else f".{part}" if field else str(part)
        field = field or "body"
        msg = err["msg"].removeprefix("Value error, ")
        if err["type"] == "missing":
            msg = "this field is required"
        elif err["type"] == "extra_forbidden":
            msg = "unknown field (check the spelling; see GET /options)"
        elif err["type"] == "json_invalid":
            field, msg = "body", "the request body is not valid JSON"
        details.append({"field": field, "message": msg})
    return _error(422, "invalid_input", "Some inputs are missing or invalid.", details)


@app.exception_handler(InputError)
async def _invalid_value(request: Request, exc: InputError):
    return _error(422, "invalid_input", "Some inputs are missing or invalid.",
                  [{"field": e.field, "message": e.message} for e in exc.errors])


@app.exception_handler(Exception)
async def _unexpected(request: Request, exc: Exception):
    log.exception("prediction failed")
    return _error(500, "internal_error", "The prediction could not be made. Please try again or contact the team.")


# ---------------------------------------------------------------- routes
@app.get("/health")
def health(request: Request):
    p = request.app.state.predictor
    return {"status": "ok", "model": p.metadata["model"], "trained_on": p.metadata["trained_on"]}


@app.get("/model-info")
def model_info(request: Request):
    return request.app.state.predictor.model_info()


@app.get("/options")
def options(request: Request):
    return request.app.state.predictor.options()


@app.post("/predict", response_model=Prediction, responses=ERRORS)
def predict(listing: ListingInput, request: Request):
    return request.app.state.predictor.predict(listing)


@app.post("/predict/batch", response_model=BatchPrediction, responses=ERRORS)
def predict_batch(batch: BatchInput, request: Request):
    results = request.app.state.predictor.predict_many(batch.listings)
    return {"count": len(results), "predictions": results}


# ---------------------------------------------------------------- Stage 10 frontend
# After `npm run build` in frontend/, the same server also serves the web page at http://127.0.0.1:8010/
# (mounted last, so the API routes above take priority).
FRONTEND = Path(__file__).resolve().parents[1] / "frontend" / "dist"
if FRONTEND.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")
