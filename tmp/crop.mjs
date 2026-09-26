import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const img = path.resolve(process.argv[2] || "tmp/ref.png");
const regions = JSON.parse(process.argv[3]); // [{name,left,top,width,height}]
const W = Number(process.argv[4] || 1918);
const H = Number(process.argv[5] || 843);

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
].filter(Boolean);
const chromePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));

const browser = await puppeteer.launch({ executablePath: chromePath, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
await page.setContent(
  `<style>*{margin:0;padding:0}</style><img src="file:///${img.replace(/\\/g, "/")}" width="${W}" height="${H}">`,
  { waitUntil: "load" }
);
for (const r of regions) {
  await page.screenshot({ path: `tmp/crop-${r.name}.png`, clip: { x: r.left, y: r.top, width: r.width, height: r.height } });
}
await browser.close();
console.log("cropped:", regions.map((r) => r.name).join(", "));
