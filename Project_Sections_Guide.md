# IT3051 Mini Project – Sections Guide (Progress Evaluation 1)

**Group:** Mine4Data (DS.Y3S2.01.01) · **Project:** Airbnb Listing Price Prediction
**Covers:** Stage 3 (EDA) and Stage 4 (Preprocessing & Feature Engineering), which are the work assessed in Progress Evaluation 1.

---

## 1. The overall process at a glance

```
Airbnb_Data.csv (74,111 rows × 29 columns)
        │
        ▼
01_EDA_Airbnb.ipynb            Stage 3 – understand the data, find problems, record decisions
        │   (findings → decision table, EDA §17)
        ▼
src/preprocessing.py           Reusable preprocessing code (also used later by the backend)
        │
        ▼
02_Preprocessing_Airbnb.ipynb  Stage 4 – clean, split, impute, encode, scale, engineer, select
        │
        ▼
data/processed/  +  models/    Clean train/test split + fitted preprocessors → Stage 6 modelling
```

**Main parts of the whole process**
1. **Understand the data**: structure, variable types, target (EDA §1–2, §6)
2. **Find data-quality problems**: missing values, duplicates, invalid values, outliers (EDA §3–5, §7)
3. **Find what drives price**: distributions and relationships (EDA §8–15)
4. **Identify leakage risks** (EDA §16)
5. **Turn findings into decisions** (EDA §17)
6. **Clean the data and engineer features** with fixed rules (Prep §2–4)
7. **Split train/test before learning anything** (Prep §5)
8. **Learned preprocessing, fitted on train only**: imputation, outliers, encoding, scaling (Prep §7–11)
9. **Feature selection** (Prep §12)
10. **Prove there is no leakage** (Prep §13)
11. **Save outputs for modelling** (Prep §15–16)

---

## 2. How to read the labels

| Label | Meaning |
|---|---|
| **COMPULSORY** | Directly required by the assignment brief (Stage 3 / Stage 4 checklist), or needed for later stages to work. **Do not remove.** |
| **RECOMMENDED** | Not named in the brief, but it justifies a decision we made. The brief says students "**MUST NOT** limit only to given aspects", so keeping several of these is expected. Removing one weakens a justification. |
| **OPTIONAL** | Extra evidence that adds value for the viva. It can be removed or shortened if time is short. Nothing breaks without it. |

---

## 3. Notebook 1 – `01_EDA_Airbnb.ipynb` (Stage 3: EDA)

| § | Section | Status | Why | Brief item it covers |
|---|---|---|---|---|
| 1 | Setup & loading | **COMPULSORY** | Needed for everything else to run | – |
| 2 | Structure & variable types | **COMPULSORY** | Named in the brief | "Understand the structure, meaning, distribution"; "Identify variable types" |
| 3 | Missing values | **COMPULSORY** | Named in the brief; drives every imputation decision | "Analyse missing values" |
| 4 | Duplicate records | **COMPULSORY** | Named in the brief (result: none found, which still must be shown) | "Analyse … duplicated records" |
| 5 | Invalid & inconsistent values | **COMPULSORY** | Finds the $1/$5 prices, 0 bathrooms and dirty zipcodes; needed for the viva topic "data-quality issues" | "Investigate … unusual observations" |
| 6 | Target variable (`log_price`) | **COMPULSORY** | Explains why a log target is used; our proposal promised a raw vs log comparison | "distribution of the data"; proposal §8 |
| 7 | Numeric features – distributions & outliers | **COMPULSORY** | Named in the brief | "Investigate outliers" |
| 8 | Categorical & boolean features | **COMPULSORY** | Distributions, rare levels and cardinality drive the encoding choices | "distribution"; "variable types" |
| 9 | Feature ↔ target relationships | **COMPULSORY** | Named in the brief; shows the main price drivers | "Identify … relevant relationships" |
| 10 | Multicollinearity & interactions | RECOMMENDED | Justifies Ridge/Lasso, the ratio features and the expectation that tree models win | Beyond checklist |
| 11 | Geospatial analysis | RECOMMENDED | The only evidence for the `dist_centre_km` feature. **If removed, that feature loses its justification.** | Beyond checklist |
| 12 | Amenities | RECOMMENDED (strongly) | The proposal promises amenity parsing; the junk and synonym findings drive preprocessing | Beyond checklist; proposal §7 |
| 13 | Dates & host tenure | RECOMMENDED | Justifies converting dates into durations (the proposal mentions host tenure) | Beyond checklist; proposal §7 |
| 14 | Free-text columns | OPTIONAL | Only confirms dropping `name`/`description`. A one-line justification is enough | – |
| 15 | Target balance across groups | **COMPULSORY** (short version is fine) | The brief asks about class imbalance. For regression you must *say why it does not apply* and what you do instead (stratified split) | "Examine class imbalance where applicable" |
| 16 | Data leakage | **COMPULSORY** | Named in the brief and in the viva topics | "Identify potential data leakage and check how it will be prevented" |
| 17 | Summary: findings → decisions | **COMPULSORY** | Named in the brief; it links EDA to Stage 4 | "Document observations that influence later … decisions" |

**EDA count:** 12 compulsory · 4 recommended · 1 optional

---

## 4. Notebook 2 – `02_Preprocessing_Airbnb.ipynb` (Stage 4: Preprocessing)

| § | Section | Status | Why | Brief item it covers |
|---|---|---|---|---|
| 1 | Setup | **COMPULSORY** | Needed for everything else to run | – |
| 2 | Columns removed | **COMPULSORY** | Every dropped column needs a reason | "Perform feature selection"; "justify each decision" |
| 3 | Invalid & duplicate records | **COMPULSORY** | Named in the brief | "Handle duplicate or invalid records" |
| 4 | Rule-based cleaning & feature engineering | **COMPULSORY** | Creates all engineered features | "Perform appropriate feature engineering" |
| 4a | ↳ Amenity cleaning evidence (raw 130 → 114 tokens) | OPTIONAL | Shows the cleaning worked | – |
| 5 | Train / test split | **COMPULSORY** | Named in the brief; must happen before any learned step | "Separate training and testing data … avoid leakage" |
| 6 | Evidence for engineered features | RECOMMENDED | Proves the new features carry signal (e.g. guests per bathroom ρ = 0.47) | Justifies feature engineering |
| 7 | Missing values | **COMPULSORY** | Named in the brief | "Handle missing values appropriately" |
| 7a | ↳ KNN neighbourhood accuracy check (95.5%) | OPTIONAL | Proves the imputation is reliable; a strong viva answer | – |
| 8 | Outliers | **COMPULSORY** | Named in the brief (we cap values rather than delete rows, and must explain why) | "Treat outliers where justified" |
| 9 | Encoding categorical variables | **COMPULSORY** | Named in the brief | "Encode categorical variables appropriately" |
| 9a | ↳ Target-encoding shrinkage plot | RECOMMENDED | Explains *why* smoothing matters for small neighbourhoods | – |
| 9b | ↳ Smoothing-strength CV table | OPTIONAL | Justifies smooth = 10; Stage 7 work done early | – |
| 10 | Scaling | **COMPULSORY** | Named in the brief (scale for linear models, not trees) | "Scale/normalise … when required" |
| 11 | Fitting the full pipelines | **COMPULSORY** | Produces the final train/test feature matrices | – |
| 12 | Feature selection | **COMPULSORY** | Named in the brief ("where appropriate") | "Perform feature selection" |
| 12a | ↳ Variance filter + correlation filter | **COMPULSORY** | These actually remove features | – |
| 12b | ↳ Mutual-information ranking | RECOMMENDED | Supports the features we kept; nothing is dropped by it | – |
| 13 | Leakage prevention | **COMPULSORY** | Named in the brief and in the viva topics | "avoid information leakage" |
| 13a | ↳ Leakage checklist | **COMPULSORY** | Short and directly answers the viva question | – |
| 13b | ↳ Leaky vs safe demonstration | OPTIONAL (highly valuable) | Shows with numbers what leakage does (16% optimistic error) | – |
| 14 | End-to-end sanity check (CV) | OPTIONAL | Stage 6 territory; proves preprocessing helps (R² 0.55 → 0.70) | – |
| 15 | Saving artefacts | **COMPULSORY** (for later stages) | Stage 6 and the backend need these files. Not assessed in the viva | Deliverables: "Source code for data pre-processing" |
| 16 | Summary of decisions | **COMPULSORY** | The brief says each decision must be justified | "justify why each important preprocessing decision was made" |

**Preprocessing count (main sections):** 13 compulsory · 1 recommended · 1 optional (plus the sub-parts marked above)

---

## 5. Supporting files

| File / folder | Status | Purpose |
|---|---|---|
| `Airbnb_Data.csv` | **COMPULSORY** | The approved dataset (deliverable: "Approved dataset") |
| `FDM_Dataset_Proposal.pdf` | **COMPULSORY** | Validation evidence (deliverable: "Dataset proposal/validation evidence") |
| `src/preprocessing.py` | **COMPULSORY** | Preprocessing source code; the brief requires the final system to use the *same* pipeline |
| `src/__init__.py` | **COMPULSORY** | Lets the notebooks and backend import `src.preprocessing` |
| `data/processed/` (train/test + `split_ids.csv`) | **COMPULSORY** for Stage 6 | Every member uses the identical split |
| `models/preprocessor_*.joblib`, `feature_names.json` | RECOMMENDED | Fitted preprocessors, kept as evidence; Stage 6 refits them inside its own pipelines |
| `figures/eda/`, `figures/preprocessing/` | RECOMMENDED | Ready-made charts for the report and slides |
| `requirements.txt` | RECOMMENDED | Lets every member install the same libraries (`pip install -r requirements.txt`) |

---

## 6. If you need to cut content – safe order

Remove in this order (least to most impact). Stop as soon as the notebook is short enough.
1. EDA §14 Free-text columns → replace with one sentence: "dropped: weak signal (ρ ≈ 0.06), may contain the price as text".
2. Prep §14 Sanity check CV (it is repeated properly in Stage 6).
3. Prep §9b Smoothing CV table → keep one sentence: "smooth = 10, same CV accuracy as auto, more robust".
4. Prep §4a Amenity cleaning evidence.
5. Prep §12b Mutual information.

**Do not cut** EDA §11 (geospatial), EDA §12 (amenities) or Prep §6 unless you also remove the features they justify (`dist_centre_km`, amenity features, the ratio features).

---

## 7. What Evaluation 1 also needs (not in the notebooks)

| Item | Status | Note |
|---|---|---|
| Each member can explain *every* section | **COMPULSORY** | The viva is individual. The brief says "Each student must understand the complete project" |
| Individual contribution split | **COMPULSORY** | The brief says "Ability to explain the student's own contribution". Agree who owns which sections (e.g. one member per block of EDA sections + one preprocessing area each) and write it down |
| Problem / scenario understanding | **COMPULSORY** | Already covered in the proposal (§3 stakeholders, §6 regression task); revise it before the viva |

---

## 8. Quick viva checklist (one line per topic the brief lists)

| Viva topic (from brief) | Where to find the answer |
|---|---|
| Problem / scenario understanding | Proposal §3, EDA intro |
| Dataset selection & justification | Proposal §7 |
| Dataset characteristics & target variable | EDA §2, §6 |
| EDA findings | EDA §9–13, §17 |
| Data-quality issues | EDA §3–5, §7 |
| Preprocessing techniques & reasons | Prep §3–10, §16 |
| Feature engineering / selection decisions | Prep §4, §6, §12 |
| Data leakage risks & prevention | EDA §16, Prep §13 |
| Own contribution | Your group's contribution split (Section 7 above) |
