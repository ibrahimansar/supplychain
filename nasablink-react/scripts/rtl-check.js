#!/usr/bin/env node
/**
 * Fails when a component uses a physical direction utility.
 *
 * The interface ships in Arabic, Urdu and Persian, where the whole layout
 * mirrors. `ml-2` is always a left margin, so in those languages it lands on
 * the wrong side; `ms-2` follows the reading direction. The difference is
 * invisible in English, which is exactly why these creep back in.
 *
 *   ml-* -> ms-*     pl-* -> ps-*     left-*  -> start-*     text-left  -> text-start
 *   mr-* -> me-*     pr-* -> pe-*     right-* -> end-*       text-right -> text-end
 */
const { readdirSync, statSync, readFileSync } = require('fs');
const { join, relative } = require('path');

const ROOT = join(__dirname, '..', 'src');

// Marketing and legal pages are single-direction by design.
const EXPECTED = new Set([
  'pages/LandingPage.js',
  'pages/PrivacyPolicy.js',
  'pages/TermsOfService.js',
]);

const PATTERNS = [
  [/\bm[lr]-(\[?[\w./%-]+\]?)/g, 'use ms-/me-'],
  [/\bp[lr]-(\[?[\w./%-]+\]?)/g, 'use ps-/pe-'],
  [/\btext-(left|right)\b/g, 'use text-start/text-end'],
  [/(?<![\w-])(left|right)-(\[?[\w./%-]+\]?)/g, 'use start-/end-'],
  [/\bborder-[lr]\b/g, 'use border-s/border-e'],
  [/\brounded-[lr]-\w+/g, 'use rounded-s-/rounded-e-'],
];

const CLASS_ATTR = /className\s*=\s*(["'`])((?:[^\\]|\\.)*?)\1/gs;

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { if (entry !== 'node_modules') walk(full); }
    else if (entry.endsWith('.js')) files.push(full);
  }
})(ROOT);

const findings = [];
for (const file of files) {
  const rel = relative(ROOT, file);
  if (EXPECTED.has(rel)) continue;
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  let m;
  CLASS_ATTR.lastIndex = 0;
  while ((m = CLASS_ATTR.exec(src)) !== null) {
    const classes = m[2];
    for (const [pattern, hint] of PATTERNS) {
      pattern.lastIndex = 0;
      let hit;
      while ((hit = pattern.exec(classes)) !== null) {
        const line = src.slice(0, m.index).split('\n').length;
        findings.push({ rel, line, cls: hit[0], hint, text: (lines[line - 1] || '').trim().slice(0, 80) });
      }
    }
  }
}

if (findings.length === 0) {
  console.log(`RTL check: clean — ${files.length} files, no physical direction utilities.`);
  process.exit(0);
}

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.rel)) byFile.set(f.rel, []);
  byFile.get(f.rel).push(f);
}
for (const [rel, items] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${rel}`);
  for (const i of items.slice(0, 6)) {
    console.log(`  ${String(i.line).padStart(4)}  ${i.cls.padEnd(14)} ${i.hint}`);
  }
  if (items.length > 6) console.log(`        … ${items.length - 6} more`);
}
console.log(`\n${findings.length} physical direction utilities. These do not mirror in Arabic, Urdu or Persian.`);
process.exit(1);
