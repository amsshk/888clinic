import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compId = process.argv[2] ?? "main";
const out = process.argv[3] ?? "/mnt/documents/888clinic-promo.mp4";
const propsArg = process.argv[4] ?? "";
const browserExecutable = process.env.PUPPETEER_EXECUTABLE_PATH || null;
const chromeMode = process.env.REMOTION_CHROME_MODE ?? "chrome-for-testing";
const inputProps = propsArg
  ? JSON.parse(propsArg.trim().startsWith("{") ? propsArg : await readFile(propsArg, "utf8"))
  : {};

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable,
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    enableMultiProcessOnLinux: false,
  },
  chromeMode,
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: compId,
  inputProps,
  puppeteerInstance: browser,
});

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  audioCodec: "aac",
  outputLocation: out,
  inputProps,
  puppeteerInstance: browser,
  muted: false,
  concurrency: 1,
});

console.log("rendered", out);
await browser.close({ silent: false });
