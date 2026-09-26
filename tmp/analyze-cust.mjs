import fs from "node:fs";
import { PNG } from "pngjs";

const words = JSON.parse(fs.readFileSync("tmp/cust-words.json", "utf8"));
console.log("== WORDS BY LINE ==");
// group words into lines: same y within 12px
const lines = [];
for (const w of words.slice().sort((a, b) => a.y - b.y || a.x - b.x)) {
  const l = lines.find((l) => Math.abs(l.y - w.y) < 14 && Math.abs(l.y + l.h / 2 - (w.y + w.h / 2)) < 18);
  if (l) {
    l.words.push(w);
    l.y = Math.min(l.y, w.y);
    l.x = Math.min(l.x, w.x);
    l.x2 = Math.max(l.x2, w.x + w.w);
  } else lines.push({ y: w.y, x: w.x, x2: w.x + w.w, h: w.h, words: [w] });
}
lines.sort((a, b) => a.y - b.y);
for (const l of lines) {
  const txt = l.words.sort((a, b) => a.x - b.x).map((w) => w.t).join(" ");
  console.log(`y=${String(l.y).padStart(4)} x=${String(l.x).padStart(4)}-${String(l.x2).padStart(4)} h=${l.h}  | ${txt}`);
}

console.log("\n== IMAGE ANALYSIS ==");
const png = PNG.sync.read(fs.readFileSync("tmp/ref-cust.png"));
const { width: W, height: H, data } = png;
const px = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
console.log("size:", W, "x", H);

const dom = {};
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const k = hex(px(x, y)); dom[k] = (dom[k] || 0) + 1; }
console.log("dominant:", Object.entries(dom).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${k}x${v}`).join(" "));

const sat = {};
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
  const [r, g, b] = px(x, y);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max - min > 55 && max > 110) { const k = hex([r, g, b]); sat[k] = (sat[k] || 0) + 1; }
}
console.log("saturated:", Object.entries(sat).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => `${k}x${v}`).join(" "));

// sample grid of colors at key regions
const probes = {
  "bg top-left": [8, 8], "sidebar-mid": [120, 400], "sidebar-mid2": [200, 500],
  "header-right(1700,40)": [1700, 40], "header(1000,30)": [1000, 30],
  "content-bg(900,700)": [900, 700], "content-bg(1800,800)": [1800, 800],
  "mid(900,300)": [900, 300],
};
for (const [k, [x, y]] of Object.entries(probes)) console.log(`probe ${k}: ${hex(px(x, y))}`);

// column profile: for each x, fraction of non-background pixels across y
function runsFromProfile(isOn, len) {
  const runs = []; let inRun = false, s = 0;
  for (let i = 0; i < len; i++) {
    const on = isOn(i);
    if (on && !inRun) { inRun = true; s = i; }
    else if (!on && inRun) { inRun = false; runs.push([s, i - 1]); }
  }
  if (inRun) runs.push([s, len - 1]);
  return runs;
}
// Detect vertical borders (dark-ish or saturated columns) in a row band
const borderColor = (c) => { const [r, g, b] = c; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return (mx - mn > 40 && mx > 90) || mx < 210; };

// Find header height: scan column x=1500 top 200
let prev = px(1500, 0);
for (let y = 1; y < 220; y++) {
  const c = px(1500, y);
  if (Math.abs(c[0] - prev[0]) + Math.abs(c[1] - prev[1]) + Math.abs(c[2] - prev[2]) > 45) console.log(`col1500 change y=${y}: ${hex(prev)} -> ${hex(c)}`);
  prev = c;
}
prev = px(0, 400);
for (let x = 1; x < 500; x++) {
  const c = px(x, 400);
  if (Math.abs(c[0] - prev[0]) + Math.abs(c[1] - prev[1]) + Math.abs(c[2] - prev[2]) > 45) console.log(`row400 change x=${x}: ${hex(prev)} -> ${hex(c)}`);
  prev = c;
}

// card detection: white runs along row y=400 in content area
const isWhite = ([r, g, b]) => r > 246 && g > 246 && b > 246;
const rowWhiteRuns = (y, x0, x1, minLen) => runsFromProfile((x) => isWhite(px(x, y)), x1).filter(([a, b]) => b - a > minLen && a >= x0 && b <= x1);
console.log("white runs y=400 (content):", JSON.stringify(rowWhiteRuns(400, 340, W, 40)));
console.log("white runs y=250:", JSON.stringify(rowWhiteRuns(250, 340, W, 40)));
console.log("white runs y=650:", JSON.stringify(rowWhiteRuns(650, 340, W, 40)));
console.log("white runs y=150:", JSON.stringify(rowWhiteRuns(150, 340, W, 40)));
console.log("white runs y=820:", JSON.stringify(rowWhiteRuns(820, 0, W, 40)));

// vertical white runs at x inside content
const colWhiteRuns = (x, y0, y1, minLen) => runsFromProfile((y) => isWhite(px(x, y)), y1).filter(([a, b]) => b - a > minLen && a >= y0 && b <= y1);
for (const x of [420, 700, 1000, 1400, 1750]) console.log(`white runs x=${x}:`, JSON.stringify(colWhiteRuns(x, 0, H, 30)));
// sidebar runs
for (const y of [100, 200, 300, 500, 700]) console.log(`row y=${y} white(0..340):`, JSON.stringify(runsFromProfile((x) => isWhite(px(x, y)), 340).filter(([a, b]) => b - a > 20)));
