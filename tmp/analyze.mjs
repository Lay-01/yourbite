import { PNG } from "pngjs";
import fs from "node:fs";

const png = PNG.sync.read(fs.readFileSync("tmp/ref.png"));
const { width: W, height: H, data } = png;

const px = (x, y) => {
  const i = (y * W + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
};
const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
const isWhite = ([r, g, b]) => r > 245 && g > 245 && b > 245;
const isDark = ([r, g, b]) => r < 60 && g < 60 && b < 70;

console.log(`size: ${W}x${H}`);

// Sample key points
const samples = {
  "top-left(0,0)": px(0, 0),
  "header-mid(960,30)": px(960, 30),
  "header-mid(960,80)": px(960, 80),
  "sidebar(100,400)": px(100, 400),
  "sidebar(300,400)": px(300, 400),
  "gap(370,400)": px(370, 400),
  "main(960,700)": px(960, 700),
  "bottom(960,830)": px(960, 830),
};
for (const [k, v] of Object.entries(samples)) console.log(`  ${k}: ${hex(v)}`);

// Detect header height: scan column x=960 from top for color change
let prev = px(960, 0);
for (let y = 1; y < 200; y++) {
  const c = px(960, y);
  if (Math.abs(c[0] - prev[0]) + Math.abs(c[1] - prev[1]) + Math.abs(c[2] - prev[2]) > 40) {
    console.log(`header change at y=${y}: ${hex(prev)} -> ${hex(c)}`);
  }
  prev = c;
}

// Detect sidebar width: scan row y=400 from left
prev = px(0, 400);
for (let x = 1; x < 600; x++) {
  const c = px(x, 400);
  if (Math.abs(c[0] - prev[0]) + Math.abs(c[1] - prev[1]) + Math.abs(c[2] - prev[2]) > 40) {
    console.log(`row400 change at x=${x}: ${hex(prev)} -> ${hex(c)}`);
  }
  prev = c;
}

// Column profile in main area (x 400..W): fraction of white pixels per column
function colRuns(y0, y1, x0, x1, label) {
  const runs = [];
  let inRun = false, start = 0;
  for (let x = x0; x < x1; x++) {
    let white = 0, total = 0;
    for (let y = y0; y < y1; y += 4) { total++; if (isWhite(px(x, y))) white++; }
    const w = white / total > 0.5;
    if (w && !inRun) { inRun = true; start = x; }
    else if (!w && inRun) { inRun = false; runs.push([start, x - 1]); }
  }
  if (inRun) runs.push([start, x1 - 1]);
  console.log(`${label}:`, runs.filter((r) => r[1] - r[0] > 30).map((r) => `${r[0]}-${r[1]}(${r[1] - r[0] + 1})`).join(" "));
}
function rowRuns(x0, x1, y0, y1, label) {
  const runs = [];
  let inRun = false, start = 0;
  for (let y = y0; y < y1; y++) {
    let white = 0, total = 0;
    for (let x = x0; x < x1; x += 4) { total++; if (isWhite(px(x, y))) white++; }
    const w = white / total > 0.5;
    if (w && !inRun) { inRun = true; start = y; }
    else if (!w && inRun) { inRun = false; runs.push([start, y - 1]); }
  }
  if (inRun) runs.push([start, y1 - 1]);
  console.log(`${label}:`, runs.filter((r) => r[1] - r[0] > 30).map((r) => `${r[0]}-${r[1]}(${r[1] - r[0] + 1})`).join(" "));
}

// Main content likely starts below header (~120) and right of sidebar (~360)
colRuns(130, H - 20, 370, W, "card columns (white runs)");
rowRuns(370, W - 20, 130, H, "card rows (white runs)");

// Sidebar: white runs horizontally in sidebar region
colRuns(130, H - 20, 0, 370, "sidebar white columns");

// Find accent-colored pixels (non-gray, saturated) to identify buttons/accents
const colorCount = {};
for (let y = 0; y < H; y += 3) {
  for (let x = 0; x < W; x += 3) {
    const [r, g, b] = px(x, y);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max - min > 60 && max > 120) { // saturated
      const key = hex([r, g, b]);
      colorCount[key] = (colorCount[key] || 0) + 1;
    }
  }
}
const top = Object.entries(colorCount).sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log("top saturated colors:", top.map(([k, v]) => `${k}x${v}`).join(" "));

// Dominant colors overall
const dom = {};
for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
  const key = hex(px(x, y));
  dom[key] = (dom[key] || 0) + 1;
}
console.log("dominant colors:", Object.entries(dom).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}x${v}`).join(" "));
