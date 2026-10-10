# System Testing and Results (Stages 9–10)

**Airbnb Listing Price Prediction**: IT3051 Mini Project, group Mine4Data
**Tested on:** 6 October 2026 · Windows 11, Python 3.14.0, Node.js 22.17, Microsoft Edge
**System under test:** FastAPI backend (`backend/`) serving the final tuned XGBoost pipeline, and the React frontend (`frontend/`), run together at `http://127.0.0.1:8010/`

## 1. Summary

The system was tested at three levels. **All 54 checks passed.**

| Level | What it tests | Tool | Location | Checks | Result |
|---|---|---|---|---|---|
| Backend / API | Every endpoint through real HTTP requests: valid input, invalid input, missing input, and consistency with the model from Stage 7 | pytest + FastAPI TestClient | `tests/test_backend.py` | 36 | 36 passed |
| Frontend logic | Input checks, form-to-request conversion, error mapping, what-if tips | Vitest | `frontend/src/logic.test.js` | 13 | 13 passed |
| End-to-end (browser) | A user filling in the real page in a browser, with the backend running | Playwright + Microsoft Edge | run during development (see §6) | 5 scenarios | 5 passed |

**How to re-run:** `py -m pytest tests -q` (from the project folder) and `cd frontend && npm test`.

## 2. Test cases and results

**Expected result** is what should happen. **Actual result** is what the system returned during testing.

### 2.1 Correct predictions

| ID | Test case | Input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| T01 | The backend uses the same pipeline as model development | 200 real listings from the held-out test set, sent to `POST /predict/batch` | Same prices as the saved Stage 7 pipeline in the notebook | Identical for all 200 listings (within 1 cent, from rounding) | Pass |
| T02 | Fixing the preprocessing bug did not change the model | All 14,822 test-set listings | Same predictions as before the fix | Identical (difference < 0.000001) | Pass |
| T03 | Full listing | NYC, Williamsburg, entire apartment, 4 guests, 2 bedrooms, 1 bathroom, 5 amenities | A price, a likely range around it, nothing filled in, no warnings | **$170.45**/night, likely $138–$206, wide $113–$264, nothing filled in, no warnings | Pass |
| T04 | Only the 4 required fields | LA, private room, house, 2 guests | A price, with every missing field filled in and reported | **$96.27**/night. All 10 optional fields reported as filled in (e.g. neighbourhood → Mid-Wilshire, bathrooms → 1). 2 warnings: no amenities, location estimated from the city | Pass |
| T05 | Neighbourhood inferred from coordinates | NYC with coordinates 40.7081, -73.9571, no neighbourhood | Neighbourhood worked out from the 5 nearest listings | Williamsburg | Pass |
| T06 | Spelling and capital letters don't matter | "nyc", "entire home/apt", "williamsburg", "internet" | Same price as with the correct spelling | Same price | Pass |
| T07 | Prices make sense | Same flat: 2 guests / 1 bedroom vs 8 guests / 4 bedrooms / 2 bathrooms | Bigger place costs more | $124.68 vs $429.52 | Pass |

### 2.2 Invalid and missing inputs (backend)

The API always replies with HTTP 422 and one message for each wrong field.

| ID | Test case | Input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| T08 | Required field missing | No `city` (repeated for `room_type`, `property_type`, `accommodates`) | 422, "this field is required" for that field | As expected for all 4 fields | Pass |
| T09 | Unknown category | City "Paris", room type "Whole house", bed type "Waterbed", cancellation "none" | 422, list of valid options | e.g. "'Paris' is not recognised; choose one of: Boston, Chicago, DC, LA, NYC, SF" | Pass |
| T10 | Typing mistake | Property type "Apartmnt", neighbourhood "Wiliamsburg" | 422 with a suggestion | "Did you mean: Apartment?"; "Did you mean: Williamsburg, Williamsbridge?" | Pass |
| T11 | Number out of range | Guests 0 or 40; bathrooms 0; bedrooms -1; beds 0 | 422 with the allowed range | e.g. "must be between 1 and 16 (got 40)" | Pass |
| T12 | Impossible bathroom count | Bathrooms 1.3 | 422 | "must be a whole or half number, e.g. 1 or 1.5" | Pass |
| T13 | Wrong data type | Guests "four"; cleaning fee "maybe"; amenities as one text string; latitude 200 | 422 for that field | 422 for each one | Pass |
| T14 | Neighbourhood in a different city | City LA, neighbourhood Williamsburg | 422 that names the right city | "'Williamsburg' is in NYC, not LA" | Pass |
| T15 | Coordinates outside the city | City NYC, coordinates in Los Angeles (34.05, -118.24) | 422 | "(34.05, -118.24) is outside NYC (latitude 40.4498 to 40.9592 …)" | Pass |
| T16 | Only one coordinate | Latitude given, longitude missing | 422 | "latitude and longitude must be given together" | Pass |
| T17 | Misspelt field name | `bedroom` instead of `bedrooms` | 422 rather than silently ignoring it | "unknown field (check the spelling …)" | Pass |
| T18 | Several mistakes at once | Property type "Igloo", 50 guests, 1.2 bathrooms | All 3 problems reported together | 3 messages in one reply | Pass |
| T19 | Broken request | Invalid JSON; empty body | 422, not a crash | "the request body is not valid JSON" | Pass |
| T20 | Unknown amenity | Adds "Jacuzzi on the moon" | Ignored with a warning, price unchanged | Price still $170.45, warning shown | Pass |
| T21 | Error inside a batch | 2 listings, the second with city "Paris" | 422 saying which listing | Field reported as `listings[1].city` | Pass |
| T22 | Service status and form options | `GET /health`, `/model-info`, `/options` | Model loaded, metrics and valid options returned | status "ok", XGBoost, R² 0.711, 6 cities, 626 neighbourhoods, 114 amenities | Pass |

### 2.3 Web page (end-to-end in Microsoft Edge)

| ID | Test case | User action | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| E01 | Empty form | Clear Guests and press **Get my price** | Red message under each required field; nothing sent to the server | 4 messages ("City is required", …) and "Please fix the 4 highlighted fields above" | Pass |
| E02 | Number out of range | Guests = 40 | Message under Guests | "Guests must be between 1 and 16" | Pass |
| E03 | Full prediction | NYC, Williamsburg, entire place, apartment, 4 guests, 2 bedrooms, 1 bathroom, moderate policy, cleaning fee, 5 amenities | Price, range bar, filled-in fields, what-if tips | **$171**/night, likely $139–$206. Filled in: location, beds, bed type, Instant Book. 5 tips, e.g. "Host one more guest +$15/night", "Add Cable TV +$8/night" | Pass |
| E04 | Changing the form after a result | Add a guest after getting the price | "Update price" banner, and clicking it gives a new price | Banner shown. New price **$186**/night | Pass |
| E05 | Phone-sized screen | Same flow at 390 × 844 px | Fits the screen with no sideways scrolling | Fits the screen with no sideways scrolling. Result shown below the form | Pass |

No errors appeared in the browser console during the browser tests.

Unit tests for the page's own logic (13, Vitest) cover:
- required fields, number ranges, whole numbers, half bathrooms, coordinates together and inside the city
- leaving out blank optional fields
- placing backend errors on the right field
- building the what-if variants and keeping only price increases

## 3. Coverage of the assignment requirements

| Requirement | Tests |
|---|---|
| **Stage 9:** load the final model and preprocessing pipeline | T01, T22 |
| **Stage 9:** accept and validate user inputs | T08–T18 |
| **Stage 9:** apply the same preprocessing as model development | T01, T02, T06 |
| **Stage 9:** generate predictions with the final model | T01, T03, T07 |
| **Stage 9:** return clear, meaningful results | T03, T04, T14, T15, E03 |
| **Stage 9:** handle invalid or missing inputs | T04, T08–T21 |
| **Stage 10:** clear input fields and instructions | E01, E03 |
| **Stage 10:** validate user inputs | E01, E02, frontend unit tests |
| **Stage 10:** present results clearly | E03 |
| **Stage 10:** simple, understandable experience | E03, E04, E05 |
| **Stage 10:** frontend and backend work end to end | E03, E04 |

## 4. Response times

Measured on the development laptop with the server running locally.

| Request | Time (median) |
|---|---|
| One price (`POST /predict`) | 87 ms (95% of requests under 98 ms) |
| 50 prices at once (`POST /predict/batch`), as used for the what-if tips | 99 ms |
| Form options (`GET /options`) | 9 ms |

A host gets a price in under a tenth of a second.

## 5. Problems found and fixed during testing

| Problem | Found by | Fix |
|---|---|---|
| A request without a neighbourhood crashed the backend (HTTP 500). With a single listing the neighbourhood column was completely empty, so pandas stored it as numbers, and the neighbourhood-filling step could not write a name into it. This never happened in training because every batch had some neighbourhoods. | Early manual tests of the API, before the automated tests | `src/preprocessing.py` now always stores the column as text. T02 confirms no prediction changed. |
| Port 8000 was already used by another program on the laptop | First end-to-end run | The system uses port 8010 |
| On phones the result appeared below the form, out of view | Mobile screenshot (E05) | The page scrolls to the result automatically |

## 6. Limitations of the testing

- The browser tests (E01–E05) were run with a Playwright script during development. The script is not stored in the repository, so the evidence is the results above and the screenshots in `figures/frontend/`.
- These tests check that the system works correctly and gives the **same** predictions as the final model. They do not re-measure how **accurate** the predictions are. That was measured on the held-out test set in Stage 7: R² 0.711, median error $21.53 per night.
- All tests ran on one laptop. Response times on other machines will differ.

## 7. Evidence

- Backend tests: `tests/test_backend.py`
- Frontend tests: `frontend/src/logic.test.js`
- Screenshots: `figures/frontend/01_form_empty.png`, `02_validation_errors.png`, `03_result_desktop.png`, `04_result_mobile.png`
