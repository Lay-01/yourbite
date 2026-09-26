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
await sleep(1000);

const info = await page.evaluate(() => {
  const $ = (s) => document.querySelector(s);
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
  };

  const strip = $(".qr-strip");
  const header = $(".qr-header");
  const sidebar = $(".qr-sidebar");
  const grid = $(".qr-grid");
  const card = $(".qr-card");
  const add = $(".qr-add");
  const fab = $(".qr-cart-fab");
  const search = $(".qr-search");
  const diet = $(".qr-diet");

  const out = {};
  out.strip = { rect: rect(strip), bg: cs(strip)?.backgroundColor, text: strip?.innerText };
  out.header = { rect: rect(header), bg: cs(header)?.backgroundColor, pos: cs(header)?.position, top: cs(header)?.top };
  out.sidebar = { rect: rect(sidebar), pos: cs(sidebar)?.position, stickyTop: cs(sidebar)?.top, buttons: sidebar ? sidebar.querySelectorAll("button").length : 0 };
  out.grid = { cols: grid ? cs(grid).gridTemplateColumns : null, cards: grid ? grid.querySelectorAll(".qr-card").length : 0 };
  out.card = { rect: rect(card), bg: cs(card)?.backgroundColor, shadow: cs(card)?.boxShadow?.slice(0, 50) };
  out.addBtn = { rect: rect(add), bg: cs(add)?.backgroundColor, color: cs(add)?.color, radius: cs(add)?.borderRadius };
  out.fabVisibleBefore = !!fab;
  out.search = { rect: rect(search) };
  out.diet = { text: diet?.innerText?.replace(/\n/g, " | "), buttons: diet ? diet.querySelectorAll("button").length : 0 };
  out.sections = [...document.querySelectorAll(".qr-sec-title")].map((h) => h.innerText.replace(/\n/g, " "));
  return out;
});

console.log(JSON.stringify(info, null, 1));

// add item -> FAB should appear
await page.evaluate(() => document.querySelector(".qr-add")?.click());
await sleep(500);
const fab = await page.evaluate(() => {
  const f = document.querySelector(".qr-cart-fab");
  return f ? { rect: [Math.round(f.getBoundingClientRect().x), Math.round(f.getBoundingClientRect().y), Math.round(f.getBoundingClientRect().width), Math.round(f.getBoundingClientRect().height)], bg: getComputedStyle(f).backgroundColor, radius: getComputedStyle(f).borderRadius, count: f.querySelector(".qr-cart-fab-count")?.innerText } : null;
});
console.log("FAB after add:", JSON.stringify(fab));

// veg filter check
await page.evaluate(() => document.querySelector(".qr-diet button.nonveg")?.click());
await sleep(400);
const nonvegCount = await page.evaluate(() => document.querySelectorAll(".qr-card").length);
console.log("cards after non-veg filter:", nonvegCount);

// scrollspy check
await page.evaluate(() => document.querySelector(".qr-diet button.nonveg")?.click());
await sleep(300);
await page.evaluate(() => document.getElementById("sec-cat-pizza")?.scrollIntoView());
await sleep(1200);
const active = await page.evaluate(() => document.querySelector(".qr-sidebar button.active")?.innerText?.replace(/\n/g, " "));
console.log("active sidebar after jumping to Pizza:", active);

// mobile check
await page.setViewport({ width: 390, height: 844 });
await sleep(700);
const mob = await page.evaluate(() => {
  const $ = (s) => document.querySelector(s);
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const grid = $(".qr-grid");
  const sidebar = $(".qr-sidebar");
  return {
    gridCols: grid ? cs(grid).gridTemplateColumns : null,
    sidebarDisplay: sidebar ? cs(sidebar).position + " / " + cs(sidebar).width : null,
    dietVisible: $(".qr-diet") ? cs($(".qr-diet")).display : "n/a",
    bodyScrollWidth: document.body.scrollWidth,
  };
});
console.log("mobile:", JSON.stringify(mob));

await browser.close();
