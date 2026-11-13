import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { findSecretFindings } from '../src/lib/secrets.ts';

const root = new URL('..', import.meta.url);
const skip = new Set(['node_modules', 'dist', '.git', 'coverage']);

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) walk(path, out);
    else if (info.size < 1_000_000) out.push(path);
  }
}

const files = [];
walk(new URL('.', root).pathname, files);
const hits = [];
for (const file of files) {
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const findings = findSecretFindings(text);
  if (findings.length) hits.push(`${file}: ${findings.join(', ')}`);
}
if (hits.length) {
  console.error(hits.join('\n'));
  process.exit(1);
}
console.log('secret scan passed');
