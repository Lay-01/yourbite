import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
].find((p) => fs.existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE:", m.text(), m.location()?.url);
});
page.on("requestfailed", (r) => console.log("REQFAIL:", r.url()));

await page.goto("http://localhost:4173/admin/tables", { waitUntil: "networkidle0" });
await sleep(300);

const clicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === "Add Table"
  );
  if (!btn) return "no button";
  btn.click();
  return "clicked";
});
console.log("step1:", clicked);
await sleep(300);
console.log("modal open:", await page.evaluate(() => !!document.querySelector(".modal")));

await page.type(".modal input", "Smoke 99");
await sleep(100);
console.log(
  "input value:",
  await page.evaluate(() => document.querySelector(".modal input")?.value)
);

const submit = await page.evaluate(() => {
  const btn = document.querySelector('.modal-foot button[type="submit"]');
  if (!btn) return "no submit btn";
  btn.click();
  return "submitted";
});
console.log("step2:", submit);
await sleep(400);
console.log(
  "modal still open:",
  await page.evaluate(() => !!document.querySelector(".modal"))
);
console.log(
  "form error:",
  await page.evaluate(() => document.querySelector(".form-error")?.textContent || "none")
);
console.log(
  "has card:",
  await page.evaluate(() => document.body.innerText.includes("Smoke 99"))
);

await browser.close();
