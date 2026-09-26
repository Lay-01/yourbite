import puppeteer from "puppeteer-core";
import fs from "node:fs";

const URL = process.env.REF_URL || "https://panchayatcafe.petpooja.com/menu";
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome"].find((p) => fs.existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
await sleep(3000);

const info = await page.evaluate(() => {
  const out = {};
  out.title = document.title;
  out.bodyFont = getComputedStyle(document.body).fontFamily;
  out.bodyBg = getComputedStyle(document.body).backgroundColor;

  // Full text
  out.text = document.body.innerText;

  // Top-level structure: walk significant elements
  const brief = (el, depth) => {
    if (depth > 5) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 5 || r.height < 5) return null;
    const cs = getComputedStyle(el);
    const kids = [...el.children].map((k) => brief(k, depth + 1)).filter(Boolean);
    return {
      tag: el.tagName.toLowerCase(),
      cls: (el.className || "").toString().slice(0, 80),
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      bg: cs.backgroundColor,
      color: cs.color,
      font: cs.fontSize + "/" + cs.fontWeight,
      radius: cs.borderRadius,
      border: cs.border,
      text: kids.length === 0 ? (el.textContent || "").trim().slice(0, 60) : undefined,
      kids,
    };
  };
  out.tree = brief(document.body, 0);

  // Collect distinct class names with a sample rect
  const classMap = {};
  document.querySelectorAll("body *").forEach((el) => {
    const c = (el.className || "").toString().trim();
    if (!c || classMap[c]) return;
    const r = el.getBoundingClientRect();
    if (r.width < 20 || r.height < 10) return;
    const cs = getComputedStyle(el);
    classMap[c] = {
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      bg: cs.backgroundColor, color: cs.color, font: cs.fontSize, weight: cs.fontWeight,
      radius: cs.borderRadius, border: cs.border.slice(0, 60), display: cs.display,
      pos: cs.position, shadow: cs.boxShadow.slice(0, 70),
    };
  });
  out.classes = classMap;
  return out;
});

fs.writeFileSync("tmp/live-info.json", JSON.stringify(info, null, 1));
console.log("title:", info.title);
console.log("font:", info.bodyFont);
console.log("bg:", info.bodyBg);
console.log("classes found:", Object.keys(info.classes).length);
await browser.close();
