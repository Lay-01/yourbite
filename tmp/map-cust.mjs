import fs from "node:fs";
import { PNG } from "pngjs";

const png = PNG.sync.read(fs.readFileSync("tmp/ref-cust.png"));
const { width: W, height: H, data } = png;
const px = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };

const CELL = 15;
const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);

const RAMP = " .:-=+*%@#";
function map(fn) {
  const out = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      let sum = 0, n = 0;
      for (let y = r * CELL; y < (r + 1) * CELL; y += 3) for (let x = c * CELL; x < (c + 1) * CELL; x += 3) { sum += fn(px(x, y)); n++; }
      const v = sum / n;
      line += RAMP[Math.max(0, Math.min(9, Math.round(v * 9)))];
    }
    out.push(line);
  }
  return out;
}

// saturation map: 0..1
const satMap = map(([r, g, b]) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return Math.min(1, (mx - mn) / 100);
});
console.log("== SATURATION MAP (cell 15px, '#'=saturated/photo, '.'=neutral) ==");
console.log("    " + Array.from({ length: cols }, (_, i) => (i % 10 === 0 ? "|" : " ")).join(""));
satMap.forEach((l, i) => console.log(String(i * CELL).padStart(4) + " " + l));

// darkness map: 0 (light) .. 1 (dark)
const darkMap = map(([r, g, b]) => 1 - (r + g + b) / (3 * 255));
console.log("\n== DARKNESS MAP (text/photos dark) ==");
console.log("    " + Array.from({ length: cols }, (_, i) => (i % 10 === 0 ? "|" : " ")).join(""));
darkMap.forEach((l, i) => console.log(String(i * CELL).padStart(4) + " " + l));
