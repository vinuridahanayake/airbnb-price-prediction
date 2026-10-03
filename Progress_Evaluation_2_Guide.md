# IT3051 Mini Project – Progress Evaluation 2 Guide

**Group:** Mine4Data (DS.Y3S2.01.01) · **Project:** Airbnb Listing Price Prediction
**Covers:** Stage 6 (Model Development) and Stage 7 (Model Optimisation & Final Model Selection), the work assessed in Progress Evaluation 2 (30%, individual viva).

---

## 1. What the brief asks for, and where it is

| Brief requirement | Where | Status |
|---|---|---|
| **Stage 6**: implement at least FOUR suitable algorithms | `03_Modelling` §3–4: 5 algorithms (Linear Regression, Ridge, KNN, Random Forest, XGBoost) + mean baseline | ✔ |
| Select algorithms appropriate to the problem | `03` §3 (justification table, 4 families) | ✔ |
| Appropriate validation strategy | `03` §2: 5-fold CV on train only, same folds for all, test locked | ✔ |
| Suitable performance metrics | `03` §2: RMSE (log) primary; MAE, R², $ errors, % within ±25% | ✔ |
| Compare model performance systematically | `03` §5 table + chart, §7 fold-by-fold comparison | ✔ |
| Record experiments, results, observations | `results/stage6_*.csv`, `03` §10 experiment log | ✔ |
| Understand why models perform better or worse | `03` §6 over/under-fitting, §8 learning curves, residuals, segments | ✔ |
| **Stage 7**: hyper-parameter tuning | `04_Optimisation` §3–5 (4 models tuned; Linear Regression has no hyper-parameters) | ✔ |
| Appropriate optimisation / search strategy | `04` §2: grid vs randomised search, with reasons | ✔ |
| Investigate feature selection / engineering / modelling choices | `04` §7: 11 ablation, feature-selection and ensemble experiments | ✔ |
| Compare tuned models with baselines | `04` §6 | ✔ |
| Select and justify the final model | `04` §8 (criteria table), §9 (test set, used once) | ✔ |
| Interpretation of results | `04` §9–10 (errors by segment, permutation importance, partial dependence) | ✔ |
| Trained final model (deliverable) | `models/final_model.joblib` + `final_model_metadata.json` (`04` §11) | ✔ |
| Ability to explain own contribution | Section 6 below: **the group must fill this in** | ⚠ to do |

---

## 2. New files

| File | Purpose |
|---|---|
| `03_Modelling_Airbnb.ipynb` | Stage 6: compares 5 algorithms with default settings |
| `04_Optimisation_Airbnb.ipynb` | Stage 7: tuning, experiments, final model, test evaluation, saving |
| `src/modelling.py` | Shared code: model catalogue, `make_pipeline`, metrics, leakage-safe CV loop |
| `results/stage6_*.csv`, `results/stage7_*.csv` | Experiment records (every score in the notebooks) |
| `figures/modelling/`, `figures/optimisation/` | Charts for the report and slides |
| `models/final_model.joblib` | **Final model**: Stage 4 preprocessing + tuned XGBoost, in one pipeline |
| `models/final_model_metadata.json` | Settings, CV and test metrics, input fields, library versions |
| `requirements.txt` | `xgboost` added |

**Re-running:** `03` takes ≈ 15 min and `04` ≈ 75–80 min on a 16-thread laptop. Keep the laptop plugged in and stop it from sleeping, or the run pauses. Run `03` first, because `04` reads `results/stage6_cv_summary.csv`.

---

## 3. Key numbers to remember

**Setup:** target `log_price` (regression) · 59,287 training / 14,822 test listings (Stage 4 split) · deployable `listing` features (90 after preprocessing) · 5-fold CV, `random_state = 42`.

| Model | Family | Stage 6 CV RMSE (defaults) | Stage 7 CV RMSE (tuned) | Tuned R² | Test RMSE |
|---|---|---|---|---|---|
| **XGBoost (final)** | boosting | 0.3929 | **0.3834** | **0.716** | **0.3808** |
| Random Forest | bagging | 0.3931 | 0.3922 | 0.703 | 0.3907 |
| Linear Regression | linear | 0.4168 | – (no hyper-parameters) | 0.664 | 0.4165 |
| Ridge | linear | 0.4172 | 0.4168 | 0.664 | 0.4165 |
| KNN | instance-based | 0.4472 | 0.4283 | 0.645 | 0.4249 |
| Mean baseline | – | 0.7191 | – | 0.000 | 0.7088 |

**Final model on the test set:** RMSE 0.381 · R² 0.711 · MAE **$47.8** · median error **$21.5** · MAPE 28% · **59% of listings within ±25%** (mean baseline: 29%) · ~70 ms per prediction · 10 MB file.

**Final XGBoost settings:** 1,257 trees · learning rate 0.022 · max depth 10 · min child weight 15 · subsample 0.84 · colsample_bytree 0.48 · L2 (lambda) 1.52 · L1 (alpha) 0.004.

**Stage 7 experiments (tuned XGBoost, Δ CV RMSE; noise ≈ 0.002):**
- Remove all engineered features: **+0.017 (worse)**. Remove amenity flags: **+0.013 (worse)**.
- Remove ratios / distance / neighbourhood encoding: no meaningful change for XGBoost. They are kept because they help the linear models and the form input.
- Keep only the top 40 / top 20 features: **+0.004 / +0.021 (worse)**, so all features are kept.
- Full feature set (reviews, host history): **−0.020 (better)**, but not available for new listings, so not used.
- Ensemble (average of XGBoost and Random Forest): +0.0007 (slightly worse), so not adopted (rule: must gain > 0.005).

**What drives the price (permutation importance):** room type ≫ location (neighbourhood, distance, coordinates) > amenities > bedrooms / guests / bathrooms.

---

## 4. Sections: what is compulsory

### `03_Modelling_Airbnb.ipynb` (Stage 6)
| § | Section | Status |
|---|---|---|
| 1 | Setup | COMPULSORY |
| 2 | Metrics & validation strategy | **COMPULSORY** (named in brief) |
| 3 | Algorithm selection & justification | **COMPULSORY** |
| 4 | Training / CV of all models | **COMPULSORY** |
| 5 | Systematic comparison | **COMPULSORY** |
| 6 | Over-/under-fitting check | **COMPULSORY** ("why models perform better or worse") |
| 7 | Paired fold comparison | RECOMMENDED: shows that the ranking is not luck |
| 8a | Learning curves | RECOMMENDED: the strongest "why" evidence |
| 8b–c | Residuals by price, errors by city/room type | RECOMMENDED |
| 9 | Listing vs full feature set | RECOMMENDED: justifies the deployable feature set |
| 10 | Experiment log + observations | **COMPULSORY** ("record experiments") |

### `04_Optimisation_Airbnb.ipynb` (Stage 7)
| § | Section | Status |
|---|---|---|
| 1–2 | Setup, search strategy | **COMPULSORY** |
| 3–5 | Tuning (Ridge, KNN, Random Forest, XGBoost) | **COMPULSORY** |
| 6 | Tuned vs baseline | **COMPULSORY** |
| 7a | Feature-engineering ablation | **COMPULSORY** ("investigate feature engineering") |
| 7b | Feature set & amenity vocabulary | RECOMMENDED |
| 7c | Feature selection (top-k) | **COMPULSORY** ("investigate feature selection") |
| 7d | Ensembling | OPTIONAL ("other modelling choices") |
| 8 | Final model selection & justification | **COMPULSORY** |
| 9 | Test-set evaluation | **COMPULSORY** |
| 10 | Interpretation | **COMPULSORY** for the viva ("interpretation of results") |
| 11 | Saving the final model | **COMPULSORY** (deliverable; Stage 9 needs it) |
| 12 | Summary, limitations, future work | **COMPULSORY** (report material) |

---

## 5. Likely viva questions (short answers)

**Why these five algorithms?** They cover four families with different assumptions, which tells us what kind of structure the data has:
- **Linear Regression:** the simplest, fully interpretable reference.
- **Ridge:** the same model with a penalty for correlated size features (accommodates / beds / bedrooms). It tests whether regularisation helps; it doesn't, because the problem is bias.
- **KNN:** mirrors how hosts price against comparable listings.
- **Random Forest (bagging) and XGBoost (boosting):** capture the non-linear effects and interactions found in the EDA, in two different ways (averaging independent trees vs correcting errors step by step).

**Why only five? Why not Lasso or HistGradientBoosting?** The brief asks for at least four. Lasso is another linear model and HistGradientBoosting is another boosting model, so they repeat families we already cover without answering a new question.

**Why RMSE on log price?** The model is trained on `log_price`. An error of 0.1 log units is about a 10% error, so it measures relative error and is fair to both cheap and expensive listings. Squaring penalises the large misses that matter most. We also report $ errors and "% within ±25%" for hosts.

**Why 5-fold CV and not just the test set?** Choosing a model or settings on the test set would make its score optimistic (the test set would then be part of training decisions). CV on the training data is used for every choice. The test set is used once, at the end. Using the same folds for every model makes the comparison paired and fair.

**How did you avoid data leakage during CV and tuning?** Preprocessing and model are one sklearn `Pipeline`. In every fold, imputation, target encoding, scaling and the feature filters are refitted on the training part only. Top-k feature selection is also inside the pipeline. The cache only reuses a preprocessor fitted on the *same* training fold.

**Why did the tree models win?** Price depends on interactions (e.g. an extra guest is worth more in an entire home than in a private room, and more in NYC than in Chicago). The learning curves show that the linear models are bias-limited: more data does not help them. The tree models keep improving with data.

**Why randomised search for XGBoost and grid search for Ridge?** Ridge has one cheap parameter, so an exhaustive grid is easy. XGBoost has 8 interacting parameters and each fit takes ~13 s: a grid would need thousands of fits. Random search tests many different values of each important parameter with far fewer fits. Log-uniform ranges suit the learning rate and regularisation, which act multiplicatively.

**What did tuning change?** XGBoost improved 2.4% (0.393 → 0.383) with a smaller learning rate, more trees, deeper trees and subsampling. KNN gained the most (4.2%, k = 5 → 20). Linear models barely changed, because they were not over-fitting.

**Did feature engineering help?** Yes. Removing all engineered features worsens RMSE by 0.017, mostly because of the amenity flags. Some features (ratios, distance) add little to XGBoost because deep trees can rebuild them from raw inputs, but they help the linear models.

**Did feature selection help?** No. Keeping only the top 40 or top 20 features made the model worse. The useful selection happened earlier: variance and correlation filters (Stage 4).

**Why XGBoost and not Random Forest or an ensemble?** XGBoost has the lowest CV error (0.383 vs 0.392). Random Forest is also 33× larger (816 MB) and about 2× slower per prediction. Averaging the two was slightly *worse* (+0.0007) because they make very similar errors, so it fails our pre-set rule (must gain > 0.005).

**Is the model over-fitted?** No. Test RMSE (0.381) ≈ CV RMSE (0.383), and every model's test score is within 0.004 of its CV score.

**Limitations?** 2017 data from six US cities. No photos, description quality or seasonality. Budget and luxury prices are pulled toward the middle. DC and SF and shared rooms are less accurate.

---

## 6. Individual contribution (to be completed by the group)

The viva is individual, and "ability to explain the student's own contribution and technical decisions" is assessed. Agree on the split, fill in the table, and make sure **every member can still explain every section**.

| Member | Stage 6 (`03`) sections | Stage 7 (`04`) sections | Other (code, report, slides) |
|---|---|---|---|
| | | | |
| | | | |
| | | | |
| | | | |

Suggested split for four members: (1) validation design & metrics + linear models; (2) KNN + Random Forest + over-fitting / learning-curve analysis; (3) XGBoost + tuning strategy & search; (4) ablation / feature selection + final selection, test evaluation & interpretation.
