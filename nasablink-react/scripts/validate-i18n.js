#!/usr/bin/env node
/**
 * i18n completeness validator
 *
 * Compares every locale JSON against the English master (en.json).
 * Reports missing keys (with their English value as a hint) and orphaned
 * keys that exist in the locale but not in en.json.
 *
 * Usage:
 *   node scripts/validate-i18n.js
 *
 * Add to package.json:
 *   "i18n:check": "node scripts/validate-i18n.js"
 *
 * Exit codes:
 *   0 — all locales are 100% complete
 *   1 — one or more locales have missing keys
 */

const fs   = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively flatten a nested object into dot-notation keys.
 * e.g. { a: { b: { c: "val" } } }  →  { "a.b.c": "val" }
 */
function flatten(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(acc, flatten(val, full));
    } else {
      acc[full] = val;
    }
    return acc;
  }, {});
}

/**
 * Load and flatten all *.json files in LOCALES_DIR.
 * Returns { [localeCode]: { [dotKey]: value } }
 */
function loadLocales() {
  const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
  const locales = {};
  for (const f of files) {
    const code = f.replace('.json', '');
    try {
      const raw  = fs.readFileSync(path.join(LOCALES_DIR, f), 'utf8');
      locales[code] = flatten(JSON.parse(raw));
    } catch (err) {
      console.error(`\n❌ Failed to parse ${f}: ${err.message}`);
      process.exit(1);
    }
  }
  return locales;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const locales    = loadLocales();
const masterKeys = Object.keys(locales['en'] || {});

if (masterKeys.length === 0) {
  console.error('\n❌ en.json not found or empty — cannot validate.');
  process.exit(1);
}

let allPassed = true;

console.log('\n📋 i18n Translation Coverage Report');
console.log('='.repeat(48));

// Sort locales so output is deterministic (en first, rest alphabetical)
const sortedCodes = Object.keys(locales).sort((a, b) =>
  a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)
);

for (const code of sortedCodes) {
  if (code === 'en') {
    console.log(`\n✅ EN — 100.0% complete (${masterKeys.length}/${masterKeys.length} keys) [master]`);
    continue;
  }

  const keys    = locales[code];
  const missing = masterKeys.filter(k => !(k in keys));
  const extra   = Object.keys(keys).filter(k => !(k in locales['en']));
  const covered = masterKeys.length - missing.length;
  const pct     = ((covered / masterKeys.length) * 100).toFixed(1);
  const status  = missing.length === 0 ? '✅' : '❌';

  console.log(
    `\n${status} ${code.toUpperCase()} — ${pct}% complete` +
    ` (${covered}/${masterKeys.length} keys)`
  );

  if (missing.length > 0) {
    allPassed = false;
    console.log(`   ▸ Missing ${missing.length} key(s):`);
    missing.forEach(k => {
      const hint = String(locales['en'][k]).substring(0, 60);
      console.log(`       - ${k}`);
      console.log(`           en: "${hint}${hint.length === 60 ? '…' : ''}"`);
    });
  }

  if (extra.length > 0) {
    console.log(`   ⚠️  ${extra.length} orphaned key(s) not present in en.json:`);
    extra.forEach(k => console.log(`       - ${k}`));
  }
}

console.log('\n' + '='.repeat(48));

if (allPassed) {
  console.log('✅ All locales are 100% complete — ready to deploy!\n');
  process.exit(0);
} else {
  console.log(
    '❌ One or more locales have missing translations.\n' +
    '   Add the missing keys before merging / deploying.\n'
  );
  process.exit(1);
}
