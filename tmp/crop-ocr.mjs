import puppeteer from "puppeteer-core";
import fs from "node:fs";
import { createWorker } from "tesseract.js";

const img = process.argv[2] || "tmp/ref-cust.png";
const regions = JSON.parse(process.argv[3]); // [{name,left,top,width,height}]
const W = Number(process.argv[4] || 1829);
const H = Number(process.argv[5] || 860);

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
const worker = await createWorker("eng");
for (const r of regions) {
  const path = `tmp/cc-${r.name}.png`;
  await page.screenshot({ path, clip: { x: r.left, y: r.top, width: r.width, height: r.height } });
  const { data } = await worker.recognize(path, {}, { tsv: true });
  const words = data.tsv.split("\n").slice(1).map((l) => l.split("\t")).filter((c) => c.length >= 12 && c[11]?.trim() && +c[10] > 30)
    .map((c) => ({ t: c[11].trim(), x: +c[6] + r.left, y: +c[7] + r.top, w: +c[8], h: +c[9] }));
  console.log(`\n### ${r.name} (crop ${r.left},${r.top} ${r.width}x${r.height})`);
  const lines = [];
  for (const w of words.slice().sort((a, b) => a.y - b.y || a.x - b.x)) {
    const l = lines.find((l) => Math.abs(l.y - w.y) < 12);
    if (l) { l.words.push(w); l.x = Math.min(l.x, w.x); l.x2 = Math.max(l.x2, w.x + w.w); }
    else lines.push({ y: w.y, x: w.x, x2: w.x + w.w, words: [w] });
  }
  for (const l of lines.sort((a, b) => a.y - b.y))
    console.log(` y=${l.y} x=${l.x}-${l.x2} | ${l.words.sort((a, b) => a.x - b.x).map((w) => w.t).join(" ")}`);
}
await worker.terminate();
await browser.close();
