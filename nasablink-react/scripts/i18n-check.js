#!/usr/bin/env node
/**
 * Translation coverage check.
 *
 * Key parity between locales is NOT sufficient on its own: t(key, 'English
 * fallback') renders English in every language when the key is absent, and the
 * locale files still look complete. This checks the three things that matter:
 *
 *   1. every locale defines the same keys as en.json
 *   2. every t() key used in code exists in en.json          <- fails the build
 *   3. how much UI text never reaches t() at all             <- reported only
 *
 * Usage: npm run i18n:check
 */
const { readFileSync, readdirSync, statSync } = require('fs');
const { join } = require('path');

const LOCALES_DIR = join(__dirname, '..', 'src', 'i18n', 'locales');
const SRC_DIR = join(__dirname, '..', 'src');
const BASE = 'en';

const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};

const locales = {};
for (const file of readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'))) {
  locales[file.replace('.json', '')] = flatten(JSON.parse(readFileSync(join(LOCALES_DIR, file), 'utf8')));
}
const baseKeys = new Set(Object.keys(locales[BASE]));

const sourceFiles = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== 'node_modules') walk(full);
    } else if (/\.(js|jsx)$/.test(entry) && !/\.test\./.test(entry)) {
      sourceFiles.push(full);
    }
  }
})(SRC_DIR);

const usedKeys = new Map();
for (const file of sourceFiles) {
  const src = readFileSync(file, 'utf8');
  const rel = file.replace(SRC_DIR + '/', '');

  // Direct calls: t('some.key', 'Fallback')
  for (const m of src.matchAll(/\bt\(\s*'([^']+)'|\bt\(\s*"([^"]+)"/g)) {
    const key = m[1] || m[2];
    if (!usedKeys.has(key)) usedKeys.set(key, rel);
  }

  // Keys held in data rather than passed inline, e.g. a tab config declaring
  // `labelKey: 'tree_admin.tabs.members'` and resolving it later with
  // t(tab.labelKey). Counting only literal t() calls reported every one of
  // those as unreferenced, which buries the genuinely dead keys in noise.
  // Any string literal that is a real key in the base locale counts as used.
  for (const m of src.matchAll(/'([a-z0-9_]+(?:\.[a-z0-9_]+)+)'|"([a-z0-9_]+(?:\.[a-z0-9_]+)+)"/gi)) {
    const key = m[1] || m[2];
    if (baseKeys.has(key) && !usedKeys.has(key)) usedKeys.set(key, rel);
  }
}

let failed = false;
const rel = (n) => String(n).padStart(4);

console.log(`\n1. Locale parity — reference ${BASE}.json (${baseKeys.size} keys)`);
for (const [lang, dict] of Object.entries(locales)) {
  if (lang === BASE) continue;
  const keys = new Set(Object.keys(dict));
  const missing = [...baseKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !baseKeys.has(k));
  // Same text as English usually means "copied in, not yet translated".
  const untranslated = [...keys].filter(
    (k) => baseKeys.has(k) && dict[k] === locales[BASE][k] && String(dict[k]).trim(),
  );
  console.log(`   ${lang}: ${rel(missing.length)} missing, ${rel(extra.length)} extra, ${rel(untranslated.length)} awaiting translation`);
  if (missing.length) {
    failed = true;
    console.log(`      missing: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ' …' : ''}`);
  }
}

const undefinedInBase = [...usedKeys.entries()].filter(([k]) => !baseKeys.has(k));
console.log(`\n2. t() keys used in code: ${usedKeys.size}`);
if (undefinedInBase.length) {
  failed = true;
  console.log(`   ${undefinedInBase.length} not defined in ${BASE}.json — these render English in EVERY locale:`);
  for (const [key, file] of undefinedInBase) console.log(`      ${key.padEnd(34)} ${file}`);
} else {
  console.log('   all defined in en.json');
}

const unused = [...baseKeys].filter((k) => !usedKeys.has(k));
console.log(`\n3. Defined but never referenced: ${unused.length} (safe to remove)`);

// Heuristic only — capitalised JSX text and common string props. Ranks files
// worth auditing; expect false positives on English-only pages such as API docs.
const hardcoded = new Map();
for (const file of sourceFiles) {
  const src = readFileSync(file, 'utf8');
  let n = 0;
  for (const m of src.matchAll(/>\s*([A-Z][A-Za-z][^<>{}\n]{3,60})\s*</g)) {
    if (!/^[A-Z_]+$/.test(m[1].trim())) n++;
  }
  for (const _ of src.matchAll(/\b(placeholder|title|aria-label|alt)="([A-Z][^"]{3,60})"/g)) n++;
  if (n) hardcoded.set(file.replace(SRC_DIR + '/', ''), n);
}
const totalHardcoded = [...hardcoded.values()].reduce((a, b) => a + b, 0);
console.log(`\n4. Literal UI strings not using t(): ~${totalHardcoded} across ${hardcoded.size} files (heuristic)`);
[...hardcoded.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  .forEach(([f, n]) => console.log(`   ${rel(n)}  ${f}`));

console.log(failed ? '\nFAIL — see items marked above.\n' : '\nOK — no missing keys.\n');
process.exit(failed ? 1 : 0);
