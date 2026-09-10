import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', '.next', 'node_modules', 'coverage']);
const SKIP_PREFIXES = ['docs/superpowers/'];
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.css', '.html', '.yml', '.yaml']);
const legacyBrand = ['RA', 'FE'].join('');
const typoPattern = new RegExp(`\\b${legacyBrand}\\b`, 'i');
const findings = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    const absolute = join(directory, entry.name);
    const relativePath = relative(ROOT, absolute).replaceAll('\\', '/');
    if (SKIP_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) continue;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(absolute);
      continue;
    }
    if (!TEXT_EXTENSIONS.has(extname(entry.name))) continue;
    const text = await readFile(absolute, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (typoPattern.test(line)) findings.push(`${relativePath}:${index + 1}: ${line.trim()}`);
    });
  }
}

await walk(ROOT);

if (findings.length) {
  console.error(`RAFAY brand audit failed. Found ${findings.length} legacy brand reference(s):`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('RAFAY brand audit passed: no standalone legacy brand references found in runtime/product files.');
