import puppeteer from "puppeteer-core";
import fs from "node:fs";

const URL = process.env.SHOT_URL || "http://localhost:4173/menu/table/01";
const OUT = "tmp/new-menu";
const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].find((p) => fs.existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();

await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
await sleep(1200);
await page.screenshot({ path: `${OUT}-desktop.png` });

// scroll down to check sidebar scrollspy + more sections
await page.evaluate(() => window.scrollBy(0, 900));
await sleep(800);
await page.screenshot({ path: `${OUT}-desktop-scrolled.png` });

// add an item so the cart FAB appears
await page.evaluate(() => {
  const btn = [...document.querySelectorAll(".qr-add")][0];
  btn?.click();
});
await sleep(600);
await page.screenshot({ path: `${OUT}-desktop-fab.png` });

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await sleep(800);
await page.screenshot({ path: `${OUT}-mobile.png` });

await browser.close();
console.log("done");
