// node tools/extract.mjs <N> [from] [to]  → prints questions from..to (1-based) of test N as JSON, to translate.
import { readSource } from "./source.mjs";
const [n, from = 1, to = 65] = process.argv.slice(2).map(Number);
console.log(JSON.stringify(readSource(n).filter((q) => q.number >= from && q.number <= to), null, 1));
