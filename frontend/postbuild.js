import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");
const assets = path.join(dist, "assets");

if (fs.existsSync(assets)) {
  const cssFiles = fs.readdirSync(assets).filter((f) => f.endsWith(".css"));
  if (cssFiles.length > 0) {
    const mainCss = path.join(assets, cssFiles[0]);
    // Copy to known fallback filenames so no cached browser or proxy request ever 404s
    fs.copyFileSync(mainCss, path.join(assets, "index-D4njRmao.css"));
    fs.copyFileSync(mainCss, path.join(assets, "index-B3uQiUOi.css"));
    fs.copyFileSync(mainCss, path.join(assets, "index.css"));
    fs.copyFileSync(mainCss, path.join(assets, "styles.css"));
    fs.copyFileSync(mainCss, path.join(dist, "styles.css"));
    fs.copyFileSync(mainCss, path.join(dist, "index.css"));
    console.log("Postbuild: Generated CSS fallback files in dist/assets and dist/");
  }
}
