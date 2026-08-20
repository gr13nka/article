/**
 * Article — colour maths.
 *
 * Shared by tools/check-sync.mjs (which gates the build on it) and
 * tools/palette-from-image.mjs (which suggests values that will pass it). One
 * implementation, so a suggested colour and a checked colour can never disagree.
 */

/** '#RGB' or '#RRGGBB' -> [r, g, b] as 0-255. Throws on anything else. */
export function parseHex(hex) {
  const m = String(hex).trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) throw new Error(`not a hex colour: ${hex}`);
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export const toHex = ([r, g, b]) =>
  '#' + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0').toUpperCase()).join('');

const linear = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };

/** WCAG relative luminance. */
export function luminance(hex) {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio, always >= 1, order-independent. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Straight-line distance in RGB. Crude next to CIEDE2000, but the only thing
 *  it is used for is "are these two colours obviously different", where it is
 *  adequate and has no dependencies. */
export function distance(a, b) {
  const [x, y] = [parseHex(a), parseHex(b)];
  return Math.hypot(...x.map((v, i) => v - y[i]));
}

export function rgbToHsl(hex) {
  const [r, g, b] = parseHex(hex).map((c) => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  if (!d) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0))
          : max === g ? (b - r) / d + 2
          : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
                  : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * Nudge `colour` along lightness ONLY — hue and saturation held exactly — until
 * it clears `min` against `ground`. Returns the original if it already does, or
 * null if no lightness in range can reach the target.
 *
 * This exists because a colour borrowed from another palette was tuned against
 * *that* palette's background, so it habitually misses a new ground's contrast
 * floor by a hair. Holding hue and saturation is what keeps the result visually
 * the same colour rather than a different one: the fix that took One Dark's
 * #E06C75 to #E16F77 was +0.6% lightness, i.e. 3/255 on two channels.
 */
export function liftToContrast(colour, ground, min = 4.5) {
  if (contrast(colour, ground) >= min) return { hex: toHex(parseHex(colour)), lifted: 0, ratio: contrast(colour, ground) };
  const [h, s, l0] = rgbToHsl(colour);
  const groundIsDark = luminance(ground) < 0.18;
  for (let step = 0.001; step <= 0.6; step += 0.001) {
    const l = groundIsDark ? Math.min(l0 + step, 1) : Math.max(l0 - step, 0);
    const hex = toHex(hslToRgb(h, s, l));
    const ratio = contrast(hex, ground);
    if (ratio >= min) return { hex, lifted: groundIsDark ? step : -step, ratio };
    if (l <= 0 || l >= 1) break;
  }
  return null;
}
