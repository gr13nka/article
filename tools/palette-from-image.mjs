#!/usr/bin/env node
/**
 * Article — read a palette out of a reference image.
 *
 * Re-skinning Article is meant to be done by a person and an LLM working from
 * reference screenshots. The expensive, error-prone step in that loop is
 * getting colours OUT of the image: describing a screenshot in prose and
 * guessing hexes from the description is slow and wrong. This reads them.
 *
 * Article's own light theme was derived exactly this way, by sampling
 * masteringemacs.org — so the tool is not a convenience, it is how the system
 * was actually built.
 *
 *   node tools/palette-from-image.mjs ref.png
 *   node tools/palette-from-image.mjs ref.png --box 380,110,1500,150
 *   node tools/palette-from-image.mjs ref.png --roles
 *
 * --box x0,y0,x1,y1   sample one region. Use it. The colour you want is
 *                     usually a masthead or a button, not the most common
 *                     pixel on the page (which is almost always the page
 *                     background).
 * --roles             map the findings onto Article's token roles and check
 *                     every suggested pair against WCAG AA up front.
 * --top N             how many colours to list (default 8).
 *
 * PNG only, 8-bit, non-interlaced — which is what every screenshot tool emits.
 * Zero dependencies: decoding is node:zlib plus the PNG filter algorithms.
 */

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { contrast, toHex, rgbToHsl, liftToContrast, distance } from './contrast.mjs';

// ---------------------------------------------------------------------------
// PNG decode
// ---------------------------------------------------------------------------

function decodePng(path) {
  const d = readFileSync(path);
  if (d.readUInt32BE(0) !== 0x89504e47) throw new Error(`${path} is not a PNG (only PNG is supported)`);
  let pos = 8, w = 0, h = 0, depth = 0, colour = 0, interlace = 0;
  const idat = [];
  let palette = null, trns = null;
  while (pos < d.length) {
    const len = d.readUInt32BE(pos);
    const type = d.toString('ascii', pos + 4, pos + 8);
    const body = d.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = body.readUInt32BE(0); h = body.readUInt32BE(4);
      depth = body[8]; colour = body[9]; interlace = body[12];
    } else if (type === 'PLTE') palette = body;
    else if (type === 'tRNS') trns = body;
    else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8) throw new Error(`unsupported bit depth ${depth} (need 8)`);
  if (interlace) throw new Error('interlaced PNG is not supported — re-export without Adam7');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colour];
  if (!channels) throw new Error(`unsupported colour type ${colour}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(h * stride);
  let prev = Buffer.alloc(stride), p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const line = Buffer.from(raw.subarray(p, p + stride)); p += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      if (filter === 1) line[i] = (line[i] + a) & 255;
      else if (filter === 2) line[i] = (line[i] + b) & 255;
      else if (filter === 3) line[i] = (line[i] + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c);
        line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    line.copy(out, y * stride);
    prev = line;
  }
  return { w, h, channels, colour, palette, trns, px: out };
}

/** Pixel -> '#RRGGBB', or null when it is transparent enough to be background. */
function pixelAt(img, x, y) {
  const { w, channels, colour, palette, px } = img;
  const i = (y * w + x) * channels;
  if (colour === 3) {
    const idx = px[i];
    return toHex([palette[idx * 3], palette[idx * 3 + 1], palette[idx * 3 + 2]]);
  }
  if (colour === 0 || colour === 4) {
    if (colour === 4 && px[i + 1] < 128) return null;
    return toHex([px[i], px[i], px[i]]);
  }
  if (colour === 6 && px[i + 3] < 128) return null;
  return toHex([px[i], px[i + 1], px[i + 2]]);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--'));
const flag = (name) => { const i = argv.indexOf(`--${name}`); return i === -1 ? null : argv[i + 1]; };
const has = (name) => argv.includes(`--${name}`);

if (!file) {
  console.error('usage: node tools/palette-from-image.mjs <ref.png> [--box x0,y0,x1,y1] [--roles] [--top N]');
  process.exit(2);
}

let img;
try { img = decodePng(file); }
catch (e) { console.error(`palette-from-image: ${e.message}`); process.exit(1); }

const box = flag('box')?.split(',').map(Number);
const [x0, y0, x1, y1] = box?.length === 4 ? box : [0, 0, img.w, img.h];
const top = Number(flag('top') ?? 8);

const counts = new Map();
let sampled = 0;
for (let y = Math.max(0, y0); y < Math.min(img.h, y1); y++) {
  for (let x = Math.max(0, x0); x < Math.min(img.w, x1); x++) {
    const hex = pixelAt(img, x, y);
    if (!hex) continue;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
    sampled++;
  }
}
if (!sampled) { console.error('palette-from-image: no opaque pixels in that region'); process.exit(1); }

const ranked = [...counts].sort((a, b) => b[1] - a[1]);
const pct = (n) => ((n / sampled) * 100).toFixed(1).padStart(5);

console.log(`\n  ${file}  ${img.w}x${img.h}` + (box ? `  region ${x0},${y0}-${x1},${y1}` : ''));
console.log(`  ${sampled.toLocaleString()} pixels, ${counts.size.toLocaleString()} distinct colours\n`);
console.log('  hex        share   hue  sat  light');
for (const [hex, n] of ranked.slice(0, top)) {
  const [h, s, l] = rgbToHsl(hex);
  console.log(`  ${hex}  ${pct(n)}%  ${String(Math.round(h)).padStart(4)}  ${(s * 100).toFixed(0).padStart(3)}  ${(l * 100).toFixed(0).padStart(4)}`);
}

if (!has('roles')) {
  console.log('\n  --roles maps these onto Article token roles and checks them against AA.\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Role suggestion. Only ever a starting point — an accent is a design decision,
// not the most saturated pixel. The value here is that every suggestion arrives
// already measured, so an unusable one is rejected before it is adopted rather
// than after.
// ---------------------------------------------------------------------------

const sig = ranked.filter(([, n]) => n / sampled > 0.001).slice(0, 40);
const byLight = [...sig].sort((a, b) => rgbToHsl(b[0])[2] - rgbToHsl(a[0])[2]);
const page = byLight[0][0];
const ink = byLight[byLight.length - 1][0];
const chromatic = [...sig]
  .filter(([hex]) => { const [, s, l] = rgbToHsl(hex); return s > 0.25 && l > 0.12 && l < 0.88; })
  .sort((a, b) => rgbToHsl(b[0])[1] - rgbToHsl(a[0])[1]);
const accent = chromatic[0]?.[0] ?? null;

const pageIsDark = rgbToHsl(page)[2] < 0.5;
console.log(`\n  Suggested roles  (${pageIsDark ? 'dark' : 'light'} reference)\n`);

const row = (role, hex, against, min, note = '') => {
  if (!hex) { console.log(`  ${role.padEnd(20)} —  not found in this image`); return; }
  const r = contrast(hex, against);
  const ok = r >= min;
  let line = `  ${role.padEnd(20)} ${hex}   ${r.toFixed(2).padStart(5)}:1 vs ${against}  min ${min}  ${ok ? 'ok' : 'BELOW AA'}`;
  console.log(line + (note ? `   ${note}` : ''));
  if (!ok) {
    const fix = liftToContrast(hex, against, min);
    if (fix) console.log(`  ${''.padEnd(20)} -> ${fix.hex} at ${fix.ratio.toFixed(2)}:1 (lightness ${fix.lifted > 0 ? '+' : ''}${(fix.lifted * 100).toFixed(1)}%, hue and saturation held)`);
    else console.log(`  ${''.padEnd(20)} -> no lightness of this hue clears ${min}:1 here; pick a different colour`);
  }
};

console.log(`  ${(pageIsDark ? '--art-dk-page' : '--art-c-paper-0').padEnd(20)} ${page}   the page ground`);
row(pageIsDark ? '--art-dk-ink-2' : '--art-c-ink-700', ink, page, 4.5, 'body text');
row(pageIsDark ? '--art-dk-accent' : '--art-c-crimson-700', accent, page, 4.5, 'headings and links');

if (accent) {
  const clash = ranked.slice(0, top).map(([h]) => h).find((h) => h !== accent && distance(h, accent) < 40 && rgbToHsl(h)[1] > 0.25);
  if (clash) console.log(`\n  note: ${clash} sits only dE ${distance(clash, accent).toFixed(0)} from the accent — too close to also serve as a status colour.`);
}

console.log(`
  Next: put these in web/tokens.css (see FORK.md), then run
    node tools/check-sync.mjs --contrast
`);
