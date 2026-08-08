import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Auto-registers every ported function module in this directory (each calls
// registerFunction(name, handler) as a side effect on import). Using
// directory auto-discovery instead of a hand-maintained import list means
// dropping in a new ported function file is the only step needed — no shared
// index file to merge-conflict on when many functions are ported in parallel.
const selfPath = fileURLToPath(import.meta.url);
const dir = path.dirname(selfPath);
// Match our own extension: '.ts' under tsx (dev), '.js' under compiled dist (prod).
const ext = path.extname(selfPath);
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(ext) && f !== `index${ext}` && !f.startsWith('_') && !f.endsWith('.d.ts'));
for (const file of files) {
  await import(`./${file}`);
}
