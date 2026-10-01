# Airbnb Listing Price Prediction

**IT3051 Fundamentals of Data Mining – Mini Project 2026** · Group **Mine4Data** (DS.Y3S2.01.01)

Predicts the nightly price of an Airbnb listing (target: `log_price`, a regression task) from details a host can enter, so new hosts can choose a suitable price.

**Final model:** tuned XGBoost inside the Stage 4 preprocessing pipeline. On the held-out test set: R² 0.711, median error $21.50 per night, 59% of listings priced within ±25%.

## Contents

| Stage | File | What it covers |
|---|---|---|
| 3 – EDA | `01_EDA_Airbnb.ipynb` | Structure, data quality, distributions, relationships, leakage risks |
| 4 – Preprocessing | `02_Preprocessing_Airbnb.ipynb`, `src/preprocessing.py` | Cleaning, train/test split, imputation, encoding, scaling, feature engineering and selection |
| 6 – Modelling | `03_Modelling_Airbnb.ipynb`, `src/modelling.py` | 7 algorithms compared with 5-fold CV |
| 7 – Optimisation | `04_Optimisation_Airbnb.ipynb` | Tuning, ablation and feature-selection experiments, final model, test evaluation |

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

Run the notebooks in order (01 → 02 → 03 → 04). Each one reads files written by the one before. Approximate run times on a 16-thread laptop: 03 ≈ 25 min, 04 ≈ 75–90 min. Keep the computer plugged in and stop it from sleeping during long runs. All steps use `random_state = 42`, so the results are reproducible.

## Using the final model (Stage 9 backend)

```python
import joblib, numpy as np, pandas as pd
from src import preprocessing as pp

model = joblib.load("models/final_model.joblib")
listing = pd.DataFrame([{"city": "NYC", "neighbourhood": "Williamsburg", "latitude": 40.7081, "longitude": -73.9571,
                         "room_type": "Entire home/apt", "property_type": "Apartment", "accommodates": 4,
                         "bathrooms": 1.0, "bedrooms": 2, "beds": 2, "bed_type": "Real Bed",
                         "cancellation_policy": "moderate", "cleaning_fee": True, "instant_bookable": "f",
                         "amenities": '{TV,"Wireless Internet",Kitchen,Heating,Essentials}'}])
price = np.exp(model.predict(pp.clean_and_engineer(listing)))   # US$ per night
```

`models/final_model_metadata.json` lists the input fields, the hyper-parameters, the metrics and the library versions.

## Dataset

Airbnb Price Dataset (Rana, Kaggle): 74,111 listings × 29 columns from six US cities (2017). Use it for academic purposes only. This repository is private, because the assignment does not allow other groups to reuse our dataset, code, models or results.
