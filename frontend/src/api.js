// Thin wrapper around the Stage 9 backend. Every error is turned into
// { message, fieldErrors: { field: message } } so the form can show it next to the right input.

export class ApiError extends Error {
  constructor(message, fieldErrors = {}) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

async function request(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new ApiError("Cannot reach the prediction service. Is the backend running (py -m uvicorn backend.app:app --port 8010)?");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const fieldErrors = {};
    for (const d of body?.details ?? []) fieldErrors[d.field] = d.message;
    throw new ApiError(body?.message ?? `The service returned an error (${res.status}).`, fieldErrors);
  }
  return body;
}

const post = (path, data) =>
  request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

export const getOptions = () => request("/options");
export const getModelInfo = () => request("/model-info");
export const predict = (listing) => post("/predict", listing);
export const predictBatch = (listings) => post("/predict/batch", { listings });
