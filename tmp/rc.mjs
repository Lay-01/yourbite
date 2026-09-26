import fs from "node:fs";
import { PNG } from "pngjs";
import { createWorker } from "tesseract.js";

const src = process.argv[2];
const regions = JSON.parse(process.argv[3]);
const scale = 2;

const png = PNG.sync.read(fs.readFileSync(src));
function crop(X, Y, CW, CH, dst) {
  const out = new PNG({ width: CW * scale, height: CH * scale });
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const sx = X + Math.floor(x / scale), sy = Y + Math.floor(y / scale);
    const si = (sy * png.width + sx) * 4, di = (y * out.width + x) * 4;
    out.data[di] = png.data[si]; out.data[di + 1] = png.data[si + 1];
    out.data[di + 2] = png.data[si + 2]; out.data[di + 3] = 255;
  }
  fs.writeFileSync(dst, PNG.sync.write(out));
}

const worker = await createWorker("eng");
for (const r of regions) {
  const dst = `tmp/rg-${r.name}.png`;
  crop(r.left, r.top, r.width, r.height, dst);
  const { data } = await worker.recognize(dst, {}, { tsv: true });
  const words = data.tsv.split("\n").slice(1).map((l) => l.split("\t"))
    .filter((c) => c.length >= 12 && c[11]?.trim() && +c[10] > 30)
    .map((c) => ({ t: c[11].trim(), x: r.left + (+c[6]) / scale, y: r.top + (+c[7]) / scale, w: +c[8] / scale, h: +c[9] / scale }));
  console.log(`\n### ${r.name} @ (${r.left},${r.top}) ${r.width}x${r.height}`);
  const lines = [];
  for (const w of words.slice().sort((a, b) => a.y - b.y || a.x - b.x)) {
    const l = lines.find((l) => Math.abs(l.y - w.y) < 8);
    if (l) { l.words.push(w); l.x = Math.min(l.x, w.x); l.x2 = Math.max(l.x2, w.x + w.w); }
    else lines.push({ y: w.y, x: w.x, x2: w.x + w.w, words: [w] });
  }
  for (const l of lines.sort((a, b) => a.y - b.y))
    console.log(` y=${l.y.toFixed(0)} x=${l.x.toFixed(0)}-${l.x2.toFixed(0)} | ${l.words.sort((a, b) => a.x - b.x).map((w) => w.t).join(" ")}`);
}
await worker.terminate();
