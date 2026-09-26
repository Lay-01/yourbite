import fs from "node:fs";
import { PNG } from "pngjs";

const png = PNG.sync.read(fs.readFileSync("tmp/ref-cust.png"));
const { width: W, data } = png;
const px = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

const [X, Y, CW, CH] = process.argv.slice(2).map(Number);
const CELL = 5;
const RAMP = " .:-=+*%@#";
console.log(`region x=${X} y=${Y} ${CW}x${CH} (each char = ${CELL}px)`);
function render(fn, title) {
  console.log(`\n== ${title} ==`);
  const hdr = [];
  for (let c = 0; c < Math.ceil(CW / CELL); c += 10) hdr.push(String(X + c * CELL).padStart(5));
  console.log("      " + hdr.join(""));
  for (let r = 0; r < Math.ceil(CH / CELL); r++) {
    let line = "";
    for (let c = 0; c < Math.ceil(CW / CELL); c++) {
      let sum = 0, n = 0;
      for (let y = Y + r * CELL; y < Y + (r + 1) * CELL; y++) for (let x = X + c * CELL; x < X + (c + 1) * CELL; x++) { sum += fn(px(x, y)); n++; }
      line += RAMP[Math.max(0, Math.min(9, Math.round((sum / n) * 9)))];
    }
    console.log(String(Y + r * CELL).padStart(5) + " " + line);
  }
}
render(([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return Math.min(1, (mx - mn) / 90); }, "SATURATION");
render(([r, g, b]) => 1 - (r + g + b) / (3 * 255), "DARKNESS");
