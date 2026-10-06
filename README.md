# Airbnb Listing Price Prediction

**IT3051 Fundamentals of Data Mining – Mini Project 2026** · Group **Mine4Data** (DS.Y3S2.01.01)

Predicts the nightly price of an Airbnb listing (target: `log_price`, a regression task) from details a host can enter, so new hosts can choose a suitable price.

**Final model:** tuned XGBoost inside the Stage 4 preprocessing pipeline. On the held-out test set: R² 0.711, median error $21.50 per night, 59% of listings priced within ±25%.

## Contents

| Stage | File | What it covers |
|---|---|---|
| 3 – EDA | `01_EDA_Airbnb.ipynb` | Structure, data quality, distributions, relationships, leakage risks |
| 4 – Preprocessing | `02_Preprocessing_Airbnb.ipynb`, `src/preprocessing.py` | Cleaning, train/test split, imputation, encoding, scaling, feature engineering and selection |
| 6 – Modelling | `03_Modelling_Airbnb.ipynb`, `src/modelling.py` | 5 algorithms (Linear Regression, Ridge, KNN, Random Forest, XGBoost) compared with 5-fold CV |
| 7 – Optimisation | `04_Optimisation_Airbnb.ipynb` | Tuning, ablation and feature-selection experiments, final model, test evaluation |
| 9 – Backend | `backend/`, `tests/test_backend.py` | FastAPI service: loads the final model, validates inputs, applies the same preprocessing, returns the price |
| 10 – Frontend | `frontend/` | React page for hosts: input form with validation, suggested price with range, what-if tips |

Viva preparation: `Progress_Evaluation_1_Simple_Summary.txt`, `Project_Sections_Guide.md` (Evaluation 1) and `Progress_Evaluation_2_Guide.md` (Evaluation 2).

Outputs: `data/processed/` (fixed train/test split), `models/` (fitted preprocessors and `final_model.joblib`), `results/` (experiment records), `figures/` (charts for the report and slides).

## Setup

1. Install Python 3.13+ and the libraries:
   ```
   pip install -r requirements.txt
   ```
2. **Unzip `Airbnb_Data.zip`** into this folder so that `Airbnb_Data.csv` sits next to the notebooks. The raw CSV is 101 MB, which is too large for GitHub, so it is stored zipped. Notebooks 01 and 02 need it. Notebooks 03 and 04 use `data/processed/` instead.
3. Open the notebooks from **this folder**, so that `from src import ...` works.

All notebooks are saved with their outputs, so you can read them without running anything.

## Re-running

Run the notebooks in order (01 → 02 → 03 → 04). Each one reads files written by the one before. Approximate run times on a 16-thread laptop: 03 ≈ 15 min, 04 ≈ 75–80 min. Keep the computer plugged in and stop it from sleeping during long runs. All steps use `random_state = 42`, so the results are reproducible.

## Stage 9 – Backend (prediction API)

Start the service from this folder, then open http://127.0.0.1:8010/docs to try it in the browser:

```
py -m uvicorn backend.app:app --port 8010 --reload
```

Port 8010 is used instead of uvicorn's default 8000 so it does not clash with other local projects.

| Endpoint | Purpose |
|---|---|
| `GET /health` | Service is up and the model is loaded |
| `GET /model-info` | Final model, hyper-parameters, test metrics |
| `GET /options` | Valid values for every input (cities, neighbourhoods per city, amenities, ranges): used to build the frontend form |
| `POST /predict` | Price for one listing |
| `POST /predict/batch` | Prices for up to 100 listings |

**How a request is handled**

1. **Load (once, at start-up).** `models/final_model.joblib` is the whole Stage 7 pipeline (Stage 4 learned preprocessing + tuned XGBoost), so nothing is refitted. `models/backend_reference.json` holds the valid categories, neighbourhoods, coordinate bounds and value ranges, all taken from the training split.
2. **Validate** (`backend/schemas.py`, `backend/predictor.py`).
   - **Required:** `city`, `room_type`, `property_type`, `accommodates`.
   - **Checks:** unknown fields, wrong types, unknown categories (with "did you mean" suggestions), a neighbourhood that is not in the chosen city, coordinates outside the city, values outside the training range, and half-bathroom steps. Every problem is reported at once.
3. **Same preprocessing as training.** The input goes through `src.preprocessing.clean_and_engineer`, then through the saved pipeline.
4. **Predict.** The model's `log_price` output is converted to US$ with `exp`.
5. **Return** a JSON result with:
   - `predicted_price`
   - `likely_range` and `wide_range`: the middle 50% and 80% of how far real test-set prices fell from the prediction
   - `filled_in`: each missing optional field and the training value used in its place
   - `warnings`: for example, ignored amenity names or a location estimated from the city only
   - the model's test metrics
6. **Errors.** Invalid input returns HTTP 422 with `{"error", "message", "details": [{"field", "message"}]}`. An unexpected failure returns 500 with a short message.

Example request body: `{"city": "NYC", "neighbourhood": "Williamsburg", "room_type": "Entire home/apt", "property_type": "Apartment", "accommodates": 4, "bedrooms": 2, "amenities": ["TV", "Wireless Internet", "Kitchen"]}`

Tests (36, including a check that the API returns the same prices as the Stage 7 pipeline for 200 real test-split listings): `py -m pytest tests -q`

If the final model is retrained, rebuild the reference file: `py -m backend.build_reference`.

## Stage 10 – Frontend (web page)

A React (Vite) page where a new host describes their listing and gets a suggested nightly price. It talks only to the Stage 9 API.

**Run the whole system (for the demo).** Node.js 20.19+ is needed once, to build the page:

```
cd frontend
npm install
npm run build
cd ..
py -m uvicorn backend.app:app --port 8010
```

Then open **http://127.0.0.1:8010/**. FastAPI serves the built page (`frontend/dist/`) and the API together.

**While editing the page:** keep the backend running and, in a second terminal, run `cd frontend && npm run dev`. Open http://localhost:5173. The page reloads on every save, and API calls are forwarded to port 8010.

| Part | File |
|---|---|
| Page layout, submitting, what-if tips | `frontend/src/App.jsx` |
| Input form (location, the place, booking rules, amenities) | `frontend/src/components/ListingForm.jsx`, `AmenityPicker.jsx`, `Field.jsx` |
| Result (price, range bar, notes, filled-in fields, tips) | `frontend/src/components/ResultPanel.jsx`, `PriceRangeBar.jsx`, `WhatIfTips.jsx` |
| Form → API body, input checks | `frontend/src/listing.js` |
| What-if variants and ranking | `frontend/src/whatif.js` |
| Calls to the API and error handling | `frontend/src/api.js` |
| Colours and layout (warm coral, light) | `frontend/src/styles.css` |

**What the user sees**

- **Clear inputs.** Short instructions at the top. The form has four groups: location, the place, booking rules and amenities.
  - Only city, room type, property type and number of guests are required, marked `*`. Everything else can be left as "Not sure".
  - All dropdown values come from `GET /options`, so the user can only choose values the model knows.
- **Validation.** Each problem is shown in red next to its field:
  - required fields
  - numbers out of range
  - whole or half bathrooms only
  - latitude and longitude given together and inside the chosen city

  The backend checks everything again, and its errors are shown on the same fields.
- **Results:**
  - the suggested price
  - "most similar listings charge between $X and $Y", with a bar showing the 50% and 80% ranges
  - notes, such as no amenities given
  - which missing details were filled in, and with what value
  - a sentence on how reliable the model is: half of test-set suggestions were within $22 of the real price
- **What-if tips.** The page asks the model about one change at a time through `POST /predict/batch`: adding each common amenity a host can realistically add, turning on Instant Book, or hosting one more guest. It then shows the five changes that raise the price most. The page says these are associations, not guaranteed increases.
- **Editing after a result.** If the user changes the form after getting a price, an "Update price" banner appears so an old price is never shown as current.
- **Phones.** The layout fits a phone screen, and the result scrolls into view after pressing the button.

Tests for the input checks and the what-if logic (13): `cd frontend && npm test`

## Dataset

Airbnb Price Dataset (Rana, Kaggle): 74,111 listings × 29 columns from six US cities (2017). Use it for academic purposes only. This repository is private, because the assignment does not allow other groups to reuse our dataset, code, models or results.
