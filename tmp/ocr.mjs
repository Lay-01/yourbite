import { createWorker } from "tesseract.js";

const img = process.argv[2] || "tmp/ref.png";
const worker = await createWorker("eng");
const { data } = await worker.recognize(img);
console.log(data.text);
await worker.terminate();
