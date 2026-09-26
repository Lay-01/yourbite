import fs from "node:fs";
import { PNG } from "pngjs";

const png = PNG.sync.read(fs.readFileSync("tmp/ref-cust.png"));
const { width: W, height: H, data } = png;
const px = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
const isWhite = ([r, g, b]) => r > 250 && g > 246 && b > 240;
const isBg = ([r, g, b]) => Math.abs(r - 250) < 6 && Math.abs(g - 245) < 7 && Math.abs(b - 239) < 9;

// color runs along a horizontal scan line
function hRuns(y, x0 = 0, x1 = W, minLen = 6) {
  const runs = [];
  let s = x0, cur = px(x0, y);
  for (let x = x0 + 1; x < x1; x++) {
    const c = px(x, y);
    if (Math.abs(c[0] - cur[0]) + Math.abs(c[1] - cur[1]) + Math.abs(c[2] - cur[2]) > 22) {
      runs.push([s, x - 1, hex(cur)]);
      s = x; cur = c;
    }
  }
  runs.push([s, x1 - 1, hex(cur)]);
  return runs.filter(([a, b]) => b - a + 1 >= minLen);
}
function vRuns(x, y0 = 0, y1 = H, minLen = 6) {
  const runs = [];
  let s = y0, cur = px(x, y0);
  for (let y = y0 + 1; y < y1; y++) {
    const c = px(x, y);
    if (Math.abs(c[0] - cur[0]) + Math.abs(c[1] - cur[1]) + Math.abs(c[2] - cur[2]) > 22) {
      runs.push([s, y - 1, hex(cur)]);
      s = y; cur = c;
    }
  }
  runs.push([s, y1 - 1, hex(cur)]);
  return runs.filter(([a, b]) => b - a + 1 >= minLen);
}
const fmt = (rs) => rs.map(([a, b, c]) => `${a}-${b}:${c}`).join("  ");

console.log("== H SCANS ==");
for (const y of [15, 60, 100, 140, 175, 230, 300, 340, 370, 430, 470, 510, 545, 620, 660, 700, 760, 800, 840]) {
  console.log(`y=${y}: ${fmt(hRuns(y, 0, W, 10))}`);
}
console.log("\n== V SCANS ==");
for (const x of [20, 100, 250, 350, 380, 500, 700, 900, 1080, 1300, 1500, 1600, 1750, 1810]) {
  console.log(`x=${x}: ${fmt(vRuns(x, 0, H, 10))}`);
}
