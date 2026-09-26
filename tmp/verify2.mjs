import puppeteer from "puppeteer-core";
import fs from "node:fs";

const URL = "http://localhost:4173/menu/table/01";
const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].find((p) => fs.existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 950 });
await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
await sleep(800);

// Diet filter via nth-child (buttons have no class until active)
const count = async () => (await page.$$(".qr-card")).length;
console.log("cards all:", await count());
await page.click(".qr-diet button:nth-child(1)"); // Veg
await sleep(400);
const vegCards = await count();
const vegMarks = await page.$$eval(".qr-card .veg-mark:not(.nonveg)", (els) => els.length);
console.log("cards veg-only:", vegCards, "| veg marks:", vegMarks);
await page.click(".qr-diet button:nth-child(1)"); // toggle off
await sleep(300);
await page.click(".qr-diet button:nth-child(2)"); // Non-Veg
await sleep(400);
const nvCards = await count();
const nvMarks = await page.$$eval(".qr-card .veg-mark.nonveg", (els) => els.length);
console.log("cards nonveg-only:", nvCards, "| nonveg marks:", nvMarks);
await page.click(".qr-diet button:nth-child(2)"); // off
await sleep(300);

// Search
await page.type(".qr-search input", "pizza");
await sleep(400);
const searchTitle = await page.$eval(".qr-sec-title", (el) => el.innerText.replace(/\n/g, " "));
const searchCards = await count();
console.log("search 'pizza':", searchTitle, "| cards:", searchCards);
await page.click(".qr-search button");
await sleep(400);
console.log("after clear, cards:", await count());

await browser.close();
console.log("done");
