import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During development (npm run dev) the page runs on :5173 and API calls are forwarded to the
// FastAPI backend on :8010. After `npm run build`, FastAPI serves the built page itself.
const API = "http://127.0.0.1:8010";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(["/predict", "/options", "/health", "/model-info"].map((p) => [p, API])),
  },
});
