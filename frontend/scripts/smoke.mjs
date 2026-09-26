/**
 * End-to-end smoke test for the Cafe Management + QR Ordering prototype.
 * Walks the acceptance flow from the spec (create table → QR → customer order
 * → owner order pipeline → billing → payment → table freed → analytics).
 *
 * Usage:  node scripts/smoke.mjs   (needs `npm run build` + `npx vite preview` running)
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:4173";
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chromePath) {
  console.error("Chrome not found — set CHROME_PATH.");
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];
let passed = 0;

function ok(label, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    problems.push(`${label}${extra ? ` — ${extra}` : ""}`);
    console.log(`  ✗ ${label}${extra ? ` — ${extra}` : ""}`);
  }
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  const url = m.location()?.url || "";
  if (m.type() === "error" && !url.includes("favicon"))
    pageErrors.push(`console: ${m.text()} (${url})`);
});

const bodyText = () => page.evaluate(() => document.body.innerText);
async function expectText(label, str) {
  const t = (await bodyText()).toLowerCase();
  ok(label, t.includes(str.toLowerCase()), `missing "${str}"`);
}

/** Click first button inside first container matching text. */
async function clickIn(containerSel, text, childSel = "button", exact = false) {
  const done = await page.evaluate(
    (containerSel, text, childSel, exact) => {
      const els = [...document.querySelectorAll(containerSel)];
      const el = els.find((e) => {
        const t = (e.textContent || "").trim();
        return exact ? t === text : t.includes(text);
      });
      if (!el) return false;
      const target = childSel ? el.querySelector(childSel) : el;
      if (!target) return false;
      target.click();
      return true;
    },
    containerSel,
    text,
    childSel,
    exact
  );
  if (!done) throw new Error(`clickIn failed: ${containerSel} "${text}"`);
  await sleep(220);
}

async function clickButton(text, exact = false) {
  await clickIn("button, a.btn", text, null, exact);
}

try {
  /* 1. Admin dashboard */
  console.log("\n1) Admin dashboard");
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0" });
  await sleep(300);
  await expectText("dashboard renders", "Today's Sales");
  await expectText("pending payments card", "Pending Payments");
  await expectText("recent orders section", "Recent Orders");
  await expectText("top selling section", "Top Selling Items");

  /* 2. Tables: add + delete */
  console.log("\n2) Table management");
  await page.goto(`${BASE}/admin/tables`, { waitUntil: "networkidle0" });
  await sleep(250);
  await expectText("seed tables render", "Payment Pending");
  await clickButton("Add Table", true);
  await sleep(250);
  const modalOpen = await page.evaluate(() => !!document.querySelector(".modal"));
  ok("add-table modal opens", modalOpen);
  await page.type(".modal input", "Smoke 99");
  const typed = await page.evaluate(() => document.querySelector(".modal input")?.value);
  ok("typed into form", typed === "Smoke 99", `value=${typed}`);
  await clickIn(".modal-foot", "Add Table");
  await sleep(400);
  const formState = await page.evaluate(() => ({
    modal: !!document.querySelector(".modal"),
    error: document.querySelector(".form-error")?.textContent || "",
    hasCard: document.body.innerText.includes("Smoke 99"),
  }));
  ok(
    "new table added",
    formState.hasCard,
    `modal=${formState.modal} error=${formState.error}`
  );
  // delete it again
  const delState = await page.evaluate(() => {
    const card = [...document.querySelectorAll(".table-card")].find((c) =>
      c.textContent.includes("Smoke 99")
    );
    if (!card) return "no-card";
    const btn = [...card.querySelectorAll("button")].find((b) => !b.textContent.trim());
    if (!btn) return "no-btn";
    btn.click();
    return "clicked";
  });
  ok("delete dialog opened", delState === "clicked", delState);
  await sleep(300);
  await clickIn(".modal-foot", "Delete");
  await sleep(300);
  t = await bodyText();
  ok("new table deleted", !t.includes("Smoke 99"));

  /* 3. QR for table 01 */
  console.log("\n3) QR generation");
  await page.evaluate(() => {
    const card = [...document.querySelectorAll(".table-card")].find(
      (c) => c.querySelector(".table-number")?.textContent.trim() === "01"
    );
    [...card.querySelectorAll("button")].find((b) => b.textContent.includes("View QR"))?.click();
  });
  await sleep(500);
  const qr = await page.evaluate(() => ({
    canvas: !!document.querySelector(".qr-frame canvas"),
    url: document.querySelector(".qr-meta code")?.textContent || "",
  }));
  ok("QR canvas rendered", qr.canvas);
  ok("QR encodes /menu/table/01", qr.url.endsWith("/menu/table/01"), qr.url);
  await page.keyboard.press("Escape");
  await sleep(250);

  /* 4. Customer menu + cart + place order */
  console.log("\n4) Customer QR menu + ordering");
  await page.goto(`${BASE}/menu/table/01`, { waitUntil: "networkidle0" });
  await sleep(300);
  await expectText("table banner", "You're ordering from");
  await expectText("table number shown", "Table 01");
  await expectText("central menu items", "Cold Coffee");

  await page.evaluate(() => {
    const add = (name) => {
      const item = [...document.querySelectorAll(".menu-item")].find(
        (el) => el.querySelector(".menu-item-title strong")?.textContent.trim() === name
      );
      item?.querySelector(".add-btn")?.click();
    };
    add("Cold Coffee");
  });
  await sleep(150);
  await page.evaluate(() => {
    const item = [...document.querySelectorAll(".menu-item")].find(
      (el) => el.querySelector(".menu-item-title strong")?.textContent.trim() === "Cold Coffee"
    );
    item?.querySelector(".qty-stepper button:last-child")?.click(); // + → 2
  });
  await sleep(150);
  await page.evaluate(() => {
    const item = [...document.querySelectorAll(".menu-item")].find(
      (el) => el.querySelector(".menu-item-title strong")?.textContent.trim() === "Paneer Pizza"
    );
    item?.querySelector(".add-btn")?.click();
  });
  await sleep(200);
  await expectText("floating cart bar", "View Cart");
  await page.click(".cart-float");
  await sleep(350);
  await expectText("cart line items", "Cold Coffee");
  await expectText("cart subtotal ₹520", "₹520");

  await page.evaluate(() => {
    const ta = document.querySelector(".cart-note textarea");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(ta, "Less spicy, no onion");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await clickButton("Place Order");
  await sleep(250);
  await expectText("confirm modal", "Confirm Order");
  await expectText("special instructions attached", "Less spicy");
  await clickIn(".modal-foot", "Confirm Order");
  await sleep(400);
  await expectText("order success screen", "Order Placed Successfully");
  await expectText("order id #1042", "#1042");
  await expectText("success shows table", "Table");
  await expectText("success shows total", "₹520");

  /* 5. Customer tracking */
  console.log("\n5) Customer order tracking");
  await clickButton("Track My Order");
  await sleep(350);
  await expectText("tracking steps", "Order Received");
  await expectText("tracking shows preparing step", "Preparing");
  await expectText("tracking shows table", "01");

  /* 6. Owner sees order, table always visible */
  console.log("\n6) Owner order pipeline");
  await page.goto(`${BASE}/admin/orders`, { waitUntil: "networkidle0" });
  await sleep(350);
  const orderCard = await page.evaluate(() => {
    const card = [...document.querySelectorAll(".order-card")].find((c) =>
      c.textContent.includes("#1042")
    );
    return card ? card.innerText : "";
  });
  ok("order #1042 appears", orderCard.includes("#1042"));
  ok("TABLE 07-style chip visible", /TABLE\s*\n?\s*01/.test(orderCard), orderCard.slice(0, 120));
  ok("items listed", orderCard.includes("Cold Coffee") && orderCard.includes("Paneer Pizza"));
  ok("note attached", orderCard.includes("Less spicy"));

  for (const action of ["Preparing", "Ready", "Served"]) {
    await clickIn(".order-card", action, "button");
    await sleep(250);
    const card = await page.evaluate(() => {
      const c = [...document.querySelectorAll(".order-card")].find((x) =>
        x.textContent.includes("#1042")
      );
      return c ? c.innerText : "";
    });
    ok(`status advanced → ${action}`, card.includes(action), card.slice(0, 80));
  }

  /* 7. Billing → paid */
  console.log("\n7) Billing + payment");
  await page.goto(`${BASE}/admin/billing`, { waitUntil: "networkidle0" });
  await sleep(350);
  // select table 01's bill (may already be selected)
  const selectedBill = await page.evaluate(() => {
    const btn = [...document.querySelectorAll(".bill-table-btn")].find(
      (b) => b.querySelector(".table-mini")?.textContent.trim() === "01"
    );
    if (btn && !btn.classList.contains("active")) btn.click();
    return !!btn;
  });
  ok("table 01 has an open bill", selectedBill);
  await sleep(300);
  const billText = await page.evaluate(() => document.querySelector(".bill-detail")?.innerText || "");
  ok("bill shows Table 01", billText.includes("Table 01"));
  ok("bill lists order #1042", billText.includes("#1042"));
  ok("bill computes 5% tax (₹546)", billText.includes("₹546"), billText.slice(-200));

  await page.evaluate(() => {
    const seg = [...document.querySelectorAll(".method-picker .segmented button")];
    seg.find((b) => b.textContent.trim() === "UPI")?.click();
  });
  await sleep(150);
  await clickIn(".pay-buttons", "Mark as Paid");
  await sleep(350);
  await expectText("payment success receipt", "Payment Successful");
  const receipt = await page.evaluate(() => document.querySelector(".receipt")?.innerText || "");
  ok("receipt shows method UPI", receipt.includes("UPI"));

  /* 8. Table freed */
  console.log("\n8) Table lifecycle");
  await page.goto(`${BASE}/admin/tables`, { waitUntil: "networkidle0" });
  await sleep(300);
  const t01 = await page.evaluate(() => {
    const card = [...document.querySelectorAll(".table-card")].find(
      (c) => c.querySelector(".table-number")?.textContent.trim() === "01"
    );
    return card ? card.innerText : "";
  });
  ok("table 01 back to Available", t01.includes("Available"), t01);

  /* 9. Analytics + history + kitchen + menu + settings */
  console.log("\n9) Remaining admin pages");
  await page.goto(`${BASE}/admin/analytics`, { waitUntil: "networkidle0" });
  await sleep(350);
  await expectText("analytics KPIs", "This Month");
  await expectText("sales by category chart", "Sales by Category");
  await expectText("top selling", "Top Selling");
  await expectText("low selling", "Low Selling Items");
  await clickIn(".tabs-row", "Last 7 Days", "button");
  await sleep(300);
  const rangeLabel = await bodyText();
  ok("date filter switches range", rangeLabel.includes("Last 7 Days"));

  await page.goto(`${BASE}/admin/history`, { waitUntil: "networkidle0" });
  await sleep(350);
  await expectText("history contains new order", "#1042");
  await expectText("history columns", "Payment");

  await page.goto(`${BASE}/admin/kitchen`, { waitUntil: "networkidle0" });
  await sleep(350);
  const kot = await bodyText();
  ok("kitchen board has in-flight orders", kot.includes("Start Preparing") || kot.includes("Mark Ready"));

  await page.goto(`${BASE}/admin/menu`, { waitUntil: "networkidle0" });
  await sleep(300);
  await expectText("menu management lists items", "Cold Coffee");
  await clickIn(".page-actions", "Add Item", "button");
  await sleep(250);
  await expectText("item form opens", "Item Name");
  await clickIn(".modal-foot", "Cancel", "button");
  await sleep(200);

  await page.goto(`${BASE}/admin/settings`, { waitUntil: "networkidle0" });
  await sleep(300);
  await clickButton("Save Settings", true);
  await sleep(300);
  await expectText("settings save toast", "Settings saved");

  /* 10. Routes */
  console.log("\n10) Routing");
  await page.goto(`${BASE}/menu`, { waitUntil: "networkidle0" });
  await sleep(250);
  await expectText("scan prompt", "Scan your table's QR code");
  await page.goto(`${BASE}/nope`, { waitUntil: "networkidle0" });
  await sleep(250);
  await expectText("404 page", "Page not found");

  /* 11. Mobile viewport check (customer menu) */
  console.log("\n11) Responsive check (390×844)");
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE}/menu/table/02`, { waitUntil: "networkidle0" });
  await sleep(400);
  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  ok("no horizontal overflow on 390px", overflow.scrollW <= overflow.clientW + 1, JSON.stringify(overflow));
} catch (err) {
  problems.push(`EXCEPTION: ${err.message}`);
  console.error(err);
}

if (pageErrors.length) {
  problems.push(...pageErrors.map((e) => `browser error: ${e}`));
}

await browser.close();

console.log(`\n===============================`);
console.log(`Passed: ${passed}`);
if (problems.length) {
  console.log(`Failed: ${problems.length}`);
  problems.forEach((p) => console.log(`  ✗ ${p}`));
  process.exit(1);
} else {
  console.log("All smoke checks passed ✔");
}
