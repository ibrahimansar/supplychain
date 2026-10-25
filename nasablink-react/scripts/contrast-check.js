#!/usr/bin/env node
/**
 * Dark-mode contrast check.
 *
 * Finds Tailwind utilities that only have a light-mode value — `text-gray-900`
 * with no `dark:` counterpart, for example. Because `darkMode: 'class'` toggles
 * a class on <html>, an element that sets a dark text colour and no dark variant
 * keeps that colour on a dark background: black text on black.
 *
 * Variant-aware: `hover:bg-gray-100` is satisfied by `dark:hover:bg-gray-800`,
 * not by an unrelated `dark:bg-*`.
 *
 * Usage:
 *   npm run contrast:check              # summary, exits non-zero on findings
 *   npm run contrast:check -- Navbar    # detail for paths matching "Navbar"
 */
const { readFileSync, readdirSync, statSync } = require('fs');
const { join } = require('path');

const SRC = join(__dirname, '..', 'src');

// Values that disappear (or clash) on a dark surface.
const RISKY = {
  text: /^(?:black|gray-(?:700|800|900)|slate-(?:700|800|900)|neutral-(?:700|800|900))$/,
  bg: /^(?:white|gray-(?:50|100)|slate-(?:50|100))$/,
  border: /^(?:gray|slate)-(?:100|200|300)$/,
};

/**
 * Paths where a light-only value is deliberate, with the reason. Keep this
 * short — it is an escape hatch, not a dumping ground.
 */
const EXPECTED = [
  // A white knob on a coloured track, and white buttons on coloured banners,
  // are correct in both themes.
  'components/ui/Input.js',
  'components/CookieConsentBanner.js',
  'components/CameraPhotoUpload.js',
  'components/PWAInstallPrompt.js',
  'pages/GDPRSettingsPage.js',
  // Keyboard chips sit on a light blue tips panel, not on the dark canvas.
  'components/ReactFlowTreeViewer.js',
  // Marketing page: intentionally always light and self-contained (renders no
  // Navbar, uses no `dark:` variants), so it looks identical regardless of the
  // app's theme setting. Its light-only values are by design, not oversights.
  'pages/LandingPage.js',
  // Same reasoning as the landing page: the contribution page is seen by
  // relatives who have no account and therefore no theme preference, so it is
  // always light and self-contained (renders no Navbar, uses no `dark:`).
  'pages/ContributePage.js',
  // Not rendered: unused component, and dev-only controls commented out in App.js.
  'components/EnhancedTreeViewer.js',
  'components/OfflineTestControls.js',
  'components/ConnectionTest.js',
];

const parse = (token) => {
  const parts = token.split(':');
  const utility = parts.pop();
  const m = utility.match(/^(text|bg|border)-(.+)$/);
  return m ? { variants: parts, family: m[1], value: m[2] } : null;
};

const satisfiedBy = (tok, other) => {
  if (other.family !== tok.family) return false;
  const others = other.variants.filter((v) => v !== 'dark');
  if (!other.variants.includes('dark')) return false;
  if (others.length !== tok.variants.length) return false;
  return tok.variants.every((v) => others.includes(v));
};

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== 'node_modules') walk(full);
    } else if (/\.(js|jsx)$/.test(entry) && !/\.test\./.test(entry)) {
      files.push(full);
    }
  }
})(SRC);

const CLASSNAME = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g;
const findings = [];

for (const file of files) {
  const rel = file.replace(SRC + '/', '');
  if (EXPECTED.some((e) => rel === e)) continue;

  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  let m;
  while ((m = CLASSNAME.exec(src)) !== null) {
    // `${...}` holds conditional classes; its contents are not literal.
    const cls = (m[1] || m[2] || '').replace(/\$\{[^}]*\}/g, ' ');
    const tokens = cls.split(/\s+/).filter(Boolean).map(parse).filter(Boolean);
    const line = src.slice(0, m.index).split('\n').length;

    for (const tok of tokens) {
      if (tok.variants.includes('dark')) continue;
      if (!RISKY[tok.family]?.test(tok.value)) continue;
      if (tokens.some((other) => satisfiedBy(tok, other))) continue;
      findings.push({
        file: rel,
        line,
        token: [...tok.variants, `${tok.family}-${tok.value}`].join(':'),
        snippet: (lines[line - 1] || '').trim().slice(0, 90),
      });
    }
  }
}

const filter = process.argv[2];
const shown = filter ? findings.filter((f) => f.file.includes(filter)) : findings;

if (filter) {
  shown.forEach((f) => console.log(`  ${f.file}:${f.line} [${f.token}] ${f.snippet}`));
} else {
  const byFile = new Map();
  for (const f of findings) byFile.set(f.file, (byFile.get(f.file) || 0) + 1);
  [...byFile.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([f, n]) => console.log(`  ${String(n).padStart(3)}  ${f}`));
}

console.log(
  findings.length === 0
    ? '\nOK — every light-mode utility has a dark counterpart.\n'
    : `\n${findings.length} light-only utilities. Add a dark: variant, or add the file to EXPECTED in ${'scripts/contrast-check.js'} with a reason.\n`,
);
process.exit(findings.length === 0 ? 0 : 1);
