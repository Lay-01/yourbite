import { createWorker } from "tesseract.js";

const img = process.argv[2];
const worker = await createWorker("eng");
const { data } = await worker.recognize(img, {}, { blocks: true });
const collect = (b, out = []) => {
  for (const p of b.paragraphs || []) for (const l of p.lines || []) for (const w of l.words || []) out.push(w);
  return out;
};
const words = collect(data.blocks).filter((w) => w.text.trim() && w.confidence > 40);
console.log(JSON.stringify(words.map((w) => ({ t: w.text, x: w.bbox.x0, y: w.bbox.y0, w: w.bbox.x1 - w.bbox.x0, h: w.bbox.y1 - w.bbox.y0 })), null, 0));
await worker.terminate();
