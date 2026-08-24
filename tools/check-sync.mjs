#!/usr/bin/env node
/**
 * Article — drift checker
 * ---------------------------------------------------------------------------
 * Report-only. Never writes. Cross-checks the kit's code surfaces against its
 * docs, and enforces the three invariants that are easy to break silently:
 *
 *   1. every semantic colour token is defined ONCE, via light-dark()
 *   2. no colour is ever baked into a data: URI (such a mark cannot be themed)
 *   3. every documented text/surface pair clears WCAG AA in BOTH themes
 *
 * Usage: node tools/check-sync.mjs   (paths resolve off this file's location,
 * not the caller's cwd, so it runs from anywhere)
 * Exit: 0 clean, 1 if anything drifted — so it can gate a commit hook or CI.
 *
 * Everything installation-specific lives in CONFIG. Anything the checker
 * cannot find is skipped with a note rather than failing, so the checker stays
 * useful mid-build and for someone who has just cloned the repo.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { contrast as ratio, luminance } from './contrast.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CONFIG = {
  prefix: 'art',
  // The authoring skill lives outside the repo, so its path is derived rather
  // than hardcoded, and overridable. A clone with no skill installed is normal,
  // not drift — hence `optional`.
  skillMd: process.env.ARTICLE_SKILL_MD ?? join(homedir(), '.claude/skills/article-style/SKILL.md'),
  tokens: 'web/tokens.css',
  componentCss: ['web/article.css', 'web/prose.css'],
  docs: ['STYLE.md', 'THEMING.md', 'README.md', 'FORK.md', 'docs/GUIDE.md'],
  ornamentDir: 'ornaments',
  demoPages: ['index.html', 'demo/index.html', 'demo/gallery.html', 'demo/type.html'],
  fontSurfaces: ['web/tokens.css', 'STYLE.md', 'README.md', 'demo/index.html'],
};

const P = CONFIG.prefix;
const warnings = [];
const notes = [];
const warn = (check, msg) => warnings.push(`[${check}] ${msg}`);
const note = (msg) => notes.push(`  · ${msg}`);

function read(path, { optional = false } = {}) {
  const full = path.startsWith('/') ? path : join(ROOT, path);
  if (!existsSync(full)) {
    if (!optional) note(`${path} not present yet — checks against it skipped`);
    return null;
  }
  return readFileSync(full, 'utf8');
}

const tokensCss = read(CONFIG.tokens);
const skillMd = read(CONFIG.skillMd, { optional: true });
const docsText = [...CONFIG.docs.map((d) => read(d)), skillMd].filter(Boolean).join('\n');

// ---------------------------------------------------------------------------
// Custom-property model. Declarations in tokens.css are one per line by
// convention, which keeps this a line parse rather than a CSS parser.
// ---------------------------------------------------------------------------

const decls = new Map();
if (tokensCss) {
  for (const m of tokensCss.matchAll(new RegExp(`^\\s*(--${P}-[a-z0-9-]+)\\s*:\\s*([^;]+);`, 'gm'))) {
    if (!decls.has(m[1])) decls.set(m[1], m[2].trim());
  }
}

const isPrimitive = (name) => name.startsWith(`--${P}-c-`) || name.startsWith(`--${P}-dk-`);

/** Split on top-level commas only, so nested var()/light-dark() survive. */
function splitArgs(s) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Resolve a token to a concrete hex for one theme. Returns null if not a colour.
 *  `table` lets an alternate palette overlay the base declarations. */
function resolve(value, theme, seen = new Set(), table = decls) {
  let v = value.trim();
  const ld = v.match(/^light-dark\(([\s\S]*)\)$/);
  if (ld) {
    const args = splitArgs(ld[1]);
    if (args.length !== 2) return null;
    return resolve(theme === 'dark' ? args[1] : args[0], theme, seen, table);
  }
  const varRef = v.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/);
  if (varRef) {
    if (seen.has(varRef[1]) || !table.has(varRef[1])) return null;
    seen.add(varRef[1]);
    return resolve(table.get(varRef[1]), theme, seen, table);
  }
  const hex = v.match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (!hex) return null;
  let h = hex[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return '#' + h.toUpperCase();
}

// ---------------------------------------------------------------------------
// 1. Token coverage
// ---------------------------------------------------------------------------
if (tokensCss && docsText) {
  for (const name of decls.keys()) {
    if (isPrimitive(name)) continue; // primitives are an implementation detail of the token file
    if (!docsText.includes(name)) warn('tokens', `${name} is defined in ${CONFIG.tokens} but named in no doc`);
  }
}

// ---------------------------------------------------------------------------
// 2. Class coverage
// ---------------------------------------------------------------------------
for (const file of CONFIG.componentCss) {
  const css = read(file);
  if (!css || !docsText) continue;
  const classes = new Set([...css.matchAll(new RegExp(`\\.${P}-[a-z0-9_-]+`, 'g'))].map((m) => m[0].slice(1)));
  for (const c of classes) {
    if (!docsText.includes(c)) warn('classes', `.${c} is defined in ${file} but named in no doc`);
  }
}

// ---------------------------------------------------------------------------
// 2b. Skill coverage. Check 2 passes if a class is named in ANY doc, so
// STYLE.md alone can satisfy it while the authoring skill silently rots — which
// is exactly what happened. The skill is the file an agent actually works from,
// so when it is installed it must name every class itself. Skipped entirely for
// a clone that has no skill.
// ---------------------------------------------------------------------------
if (skillMd) {
  for (const file of CONFIG.componentCss) {
    const css = read(file);
    if (!css) continue;
    for (const c of new Set([...css.matchAll(new RegExp(`\\.${P}-[a-z0-9_-]+`, 'g'))].map((m) => m[0].slice(1)))) {
      if (!skillMd.includes(c)) warn('skill', `.${c} is defined in ${file} but not named in the article-style skill`);
    }
  }
  for (const f of existsSync(join(ROOT, CONFIG.ornamentDir)) ? readdirSync(join(ROOT, CONFIG.ornamentDir)).filter((n) => n.endsWith('.svg')) : []) {
    if (!skillMd.includes(f)) warn('skill', `${CONFIG.ornamentDir}/${f} is not named in the article-style skill`);
  }
  for (const role of ['display', 'body', 'mono']) {
    const fam = decls.get(`--${P}-font-${role}`)?.match(/^'([^']+)'/)?.[1];
    if (fam && !skillMd.includes(fam)) warn('skill', `"${fam}" (--${P}-font-${role}) is not named in the article-style skill`);
  }
}

// ---------------------------------------------------------------------------
// 3. Theme parity — the invariant that keeps two themes from drifting apart.
// A semantic token that carries a colour must go through light-dark(), so its
// two values live side by side on one line and cannot be edited independently.
// ---------------------------------------------------------------------------
if (tokensCss) {
  for (const [name, value] of decls) {
    if (isPrimitive(name)) continue;
    const carriesColour = /#[0-9a-fA-F]{3,8}/.test(value) || new RegExp(`var\\(--${P}-(c|dk)-`).test(value);
    if (carriesColour && !value.includes('light-dark(')) {
      warn('theme', `${name} carries a colour but is not wrapped in light-dark() — it will be identical in both themes`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3b. Theme-pair parity. light-dark() carries colours only, so a non-colour
// value that differs per theme must be declared twice — once under
// prefers-color-scheme, once under [data-theme="dark"]. That is the one place
// in the system where two copies of a theme value exist, so it is checked:
// the two blocks must declare the same custom properties with the same values.
// ---------------------------------------------------------------------------
if (tokensCss) {
  const declsIn = (css) => {
    const out = new Map();
    for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      if (m[1] === '--color-scheme') continue;
      out.set(m[1], m[2].trim());
    }
    return out;
  };
  const media = tokensCss.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{([\s\S]*?)\n\}/);
  const attr = [...tokensCss.matchAll(/\[data-theme="dark"\][^{]*\{([^}]*)\}/g)].map((m) => m[1]).join('\n');
  if (media && attr) {
    const a = declsIn(media[1]);
    const b = declsIn(attr);
    b.delete('--color-scheme');
    for (const [k, v] of a) {
      if (!b.has(k)) warn('theme-pair', `${k} is set under prefers-color-scheme: dark but not under [data-theme="dark"] — a forced dark theme would miss it`);
      else if (b.get(k) !== v) warn('theme-pair', `${k} is "${v}" under prefers-color-scheme: dark but "${b.get(k)}" under [data-theme="dark"]`);
    }
    for (const k of b.keys()) {
      if (k !== 'color-scheme' && !a.has(k) && k.startsWith('--')) {
        warn('theme-pair', `${k} is set under [data-theme="dark"] but not under prefers-color-scheme: dark — following the OS would miss it`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Baked colour in data URIs. A mark whose colour is inside a data: URI can
// never follow the theme or the accent, because currentColor cannot reach in.
// ---------------------------------------------------------------------------
for (const file of [CONFIG.tokens, ...CONFIG.componentCss, ...CONFIG.demoPages]) {
  const text = read(file, { optional: true });
  if (!text) continue;
  for (const m of text.matchAll(/data:image\/svg\+xml[^"')]*/g)) {
    if (/%23[0-9a-fA-F]{3,8}|#[0-9a-fA-F]{6}|rgba?\(/.test(m[0])) {
      warn('baked-colour', `${file} embeds a colour inside a data: URI — use an ornaments/ file with mask-image + background-color: currentColor instead`);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Contrast, in both themes.
// ---------------------------------------------------------------------------
// [ink, surface, minimum, label]. 3.0 marks a pair only ever used at large
// display sizes, where AA allows the lower bar.
const PAIRS = [
  [`--${P}-ink`, `--${P}-surface`, 4.5, 'body text on the page'],
  [`--${P}-ink-strong`, `--${P}-surface`, 4.5, 'display headline on the page'],
  [`--${P}-ink-muted`, `--${P}-surface`, 4.5, 'captions and eyebrows on the page'],
  [`--${P}-ink`, `--${P}-surface-raised`, 4.5, 'body text on a raised surface'],
  [`--${P}-ink-muted`, `--${P}-surface-raised`, 4.5, 'muted text on a raised surface'],
  [`--${P}-ink`, `--${P}-surface-sunken`, 4.5, 'body text on a sunken surface'],
  [`--${P}-accent`, `--${P}-surface`, 4.5, 'accent headings on the page'],
  [`--${P}-link`, `--${P}-surface`, 4.5, 'links in body text'],
  [`--${P}-accent-ink`, `--${P}-accent`, 4.5, 'text on an accent fill'],
  [`--${P}-accent-ink`, `--${P}-accent-strong`, 4.5, 'button label on the loud accent'],
  [`--${P}-bar-ink`, `--${P}-bar`, 4.5, 'masthead text on the bar'],
  // The wordmark is --art-text-2xl (28px), which is WCAG "large text", so its
  // bar is 3:1 rather than 4.5:1. Holding it to 4.5 was over-strict and
  // wrongly disqualified two otherwise-valid accents.
  [`--${P}-bar-mark`, `--${P}-bar`, 3.0, 'wordmark on the bar (large text)'],
  [`--${P}-action-ink`, `--${P}-action`, 4.5, 'button label on the action fill'],
  [`--${P}-code-ink`, `--${P}-code-bg`, 4.5, 'code on its ground'],
  [`--${P}-danger`, `--${P}-surface`, 4.5, 'error text on the page'],
  [`--${P}-success`, `--${P}-surface`, 4.5, 'success text on the page'],
  [`--${P}-warning`, `--${P}-surface`, 4.5, 'warning text on the page'],
];

const REPORT = process.argv.includes('--contrast');

// Alternate dark palettes ([data-dark="…"]) override layer-1 primitives only.
// Each one is a whole theme a user can actually be looking at, so each is held
// to the same contrast floor as the default — an unchecked alternate palette is
// just a broken theme nobody has measured yet.
const variants = new Map();
if (tokensCss) {
  for (const m of tokensCss.matchAll(/\[data-dark="([a-z0-9-]+)"\][^{]*\{([^}]*)\}/g)) {
    const table = new Map(decls);
    for (const d of m[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) table.set(d[1], d[2].trim());
    variants.set(m[1], table);
  }
}

if (tokensCss) {
  const passes = [['light', decls], ['dark', decls],
                  ...[...variants].map(([n, t]) => [`dark:${n}`, t])];
  for (const [theme, table] of passes) {
    if (REPORT) console.log(`\n  ${theme.toUpperCase()}\n  ${'-'.repeat(74)}`);
    for (const [inkName, bgName, min, label] of PAIRS) {
      if (!table.has(inkName) || !table.has(bgName)) continue;
      const mode = theme.startsWith('dark') ? 'dark' : 'light';
      const ink = resolve(table.get(inkName), mode, new Set(), table);
      const bg = resolve(table.get(bgName), mode, new Set(), table);
      if (!ink || !bg) { warn('contrast', `could not resolve ${inkName} / ${bgName} in ${theme}`); continue; }
      const r = ratio(ink, bg);
      if (REPORT) {
        console.log(`  ${(r >= min ? 'pass' : 'FAIL').padEnd(5)} ${r.toFixed(2).padStart(6)}:1  min ${min}  ${ink} on ${bg}  ${label}`);
      }
      if (r < min) {
        warn('contrast', `${theme}: ${label} — ${inkName} ${ink} on ${bgName} ${bg} is ${r.toFixed(2)}:1, below ${min}:1`);
      }
    }
  }
  if (REPORT) console.log('');
}

// Families the operating system already provides. They appear in the stacks as
// fallbacks, are never loaded by a <link>, and so are not design decisions that
// need documenting — only webfonts are.
const SYSTEM_FONTS = new Set([
  'Times New Roman', 'Segoe UI', 'SF Mono', 'Menlo', 'Georgia', 'Helvetica Neue',
  'Arial', 'Courier New', 'Consolas', 'Cambria', 'Palatino', 'Optima',
]);

// ---------------------------------------------------------------------------
// 6. Fonts — the canonical families must be named wherever they are rendered
// or documented, so a swap can never land in only half the kit.
// ---------------------------------------------------------------------------
if (tokensCss) {
  for (const role of ['display', 'body', 'mono']) {
    // Every QUOTED family in the stack, not just the primary — a CJK fallback
    // that drifts out of the docs is exactly as broken as a primary that does.
    const families = [...(decls.get(`--${P}-font-${role}`) ?? '').matchAll(/'([^']+)'/g)]
      .map((m) => m[1])
      .filter((f) => !SYSTEM_FONTS.has(f));
    if (!families.length) { note(`--${P}-font-${role} names no quoted family; font check skipped for it`); continue; }
    for (const family of families) {
      for (const surface of CONFIG.fontSurfaces) {
        const text = surface === CONFIG.tokens ? tokensCss : read(surface);
        if (text !== null && !text.includes(family)) warn('fonts', `"${family}" (--${P}-font-${role}) is not named in ${surface}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Ornament inventory, both directions.
// ---------------------------------------------------------------------------
const ornDir = join(ROOT, CONFIG.ornamentDir);
if (existsSync(ornDir) && docsText) {
  const files = readdirSync(ornDir).filter((f) => f.endsWith('.svg'));
  const cited = new Set([...docsText.matchAll(/[\w-]+\.svg/g)].map((m) => m[0]));
  for (const f of files) if (!cited.has(f)) warn('ornaments', `${CONFIG.ornamentDir}/${f} exists but is cited in no doc`);
  for (const c of cited) if (!files.includes(c)) warn('ornaments', `"${c}" is cited in the docs but ${CONFIG.ornamentDir}/${c} does not exist`);
}

// ---------------------------------------------------------------------------
// 8. Demo asset references resolve.
// ---------------------------------------------------------------------------
// Covers the component CSS too: a mask-image pointing at a missing ornament
// fails silently — the mark simply does not paint — so it must be checked, not
// trusted.
//
// The reference must start right after a quote or `(`, which is what keeps an
// absolute URL out: `https://…` fails on the colon at the first character.
// Anchoring there is also why a same-directory ref like `web/tokens.css` is
// caught — the root landing page uses those, and a `../`-only pattern saw none
// of them.
for (const page of [...CONFIG.demoPages, ...CONFIG.componentCss]) {
  const text = read(page, { optional: true });
  if (!text) continue;
  for (const m of new Set([...text.matchAll(/(?<=[\"'(])(?:\.{0,2}\/)?[\w.-]+(?:\/[\w.-]+)*\.(?:svg|css|js)/g)].map((x) => x[0]))) {
    if (!existsSync(join(ROOT, dirname(page), m))) warn('assets', `${page} references ${m}, which does not exist`);
  }
}

// ---- Report ----
if (notes.length) {
  console.log('check-sync: skipped');
  for (const n of notes) console.log(n);
}
if (warnings.length === 0) {
  console.log('check-sync: OK — no drift found');
  process.exit(0);
}
for (const w of warnings) console.log(w);
console.log(`check-sync: ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
process.exit(1);
