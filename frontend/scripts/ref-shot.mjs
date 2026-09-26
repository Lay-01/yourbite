import puppeteer from "puppeteer-core";
import fs from "node:fs";

const URL = process.env.REF_URL || "https://panchayatcafe.petpooja.com/orders/menu";
const OUT = process.env.OUT || "tmp/ref";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const chromePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chromePath) { console.error("no chrome"); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: chromePath, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 2000, deviceScaleFactor: 1 });
try {
  const resp = await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
  console.log("status:", resp?.status());
} catch (e) {
  console.log("goto error:", e.message);
}
await sleep(4000);
await page.screenshot({ path: `${OUT}-desktop.png`, fullPage: false });
const text = await page.evaluate(() => document.body.innerText.slice(0, 6000));
fs.writeFileSync(`${OUT}-text.txt`, text);
console.log("TEXT:\n", text.slice(0, 3000));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await sleep(1500);
await page.screenshot({ path: `${OUT}-mobile.png`, fullPage: false });
await browser.close();
console.log("done");
