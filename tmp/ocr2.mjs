import { createWorker } from "tesseract.js";

const img = process.argv[2] || "tmp/ref-cust.png";
const worker = await createWorker("eng");
const { data } = await worker.recognize(img, {}, { blocks: true, tsv: true });
console.error("keys:", Object.keys(data).join(","));
console.error("blocks type:", Array.isArray(data.blocks) ? "array:" + data.blocks.length : typeof data.blocks);
if (data.tsv) {
  const lines = data.tsv.split("\n").slice(1);
  const words = [];
  for (const l of lines) {
    const c = l.split("\t");
    if (c.length < 12) continue;
    const text = c[11]?.trim();
    if (!text || text === "TEXT") continue;
    words.push({ t: text, x: +c[6], y: +c[7], w: +c[8], h: +c[9], conf: +c[10] });
  }
  console.log(JSON.stringify(words.filter((w) => w.conf > 30)));
}
await worker.terminate();
