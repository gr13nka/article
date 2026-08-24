/*
 * PNG frames -> animated PNG.
 *
 * No pixel data is touched: each frame's compressed IDAT stream is reused
 * verbatim as an fdAT, so the result keeps full colour and full alpha.
 *
 * That matters here more than it usually would. A GIF carries one 256-colour
 * table for the whole animation, and this animation spans three palettes —
 * a cream page, a warm grey one and a violet one. Split three ways, the table
 * has too few slots left for the greys that antialias type, and a dithered
 * design system reads as a noisy one. APNG costs roughly five times the bytes
 * of a GIF per frame and is worth it; the take is three held frames, so the
 * file is smaller than the GIF was anyway.
 *
 * Adapted from the author's craft-readme skill, trimmed to the one entry point
 * this repo uses. Node's zlib is the only import; there is nothing to install.
 */
import { crc32 } from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunks(buf) {
  const out = [];
  let p = 8;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    out.push({ type: buf.toString('ascii', p + 4, p + 8), data: buf.subarray(p + 8, p + 8 + len) });
    p += 12 + len;
  }
  return out;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

/* One frame's control chunk. The delay is the fraction num/den seconds. */
const fcTL = (seq, w, h, num, den) => {
  const d = Buffer.alloc(26);
  d.writeUInt32BE(seq, 0); d.writeUInt32BE(w, 4); d.writeUInt32BE(h, 8);
  d.writeUInt32BE(0, 12); d.writeUInt32BE(0, 16);
  d.writeUInt16BE(num, 20); d.writeUInt16BE(den, 22);
  d[24] = 0; d[25] = 0;                              // dispose NONE, blend SOURCE
  return chunk('fcTL', d);
};

/*
 * `frames` is [{ png, seconds }] in order: a PNG buffer and how long it holds.
 * Returns the APNG buffer, which loops forever.
 */
export function encodeAPNG(frames) {
  const DEN = 100;                                   // delays in hundredths
  const ihdr = chunks(frames[0].png).find((c) => c.type === 'IHDR');
  const w = ihdr.data.readUInt32BE(0), h = ihdr.data.readUInt32BE(4);

  const acTL = Buffer.alloc(8);
  acTL.writeUInt32BE(frames.length, 0);
  acTL.writeUInt32BE(0, 4);                          // play count 0 = forever

  const parts = [SIG, chunk('IHDR', ihdr.data), chunk('acTL', acTL)];
  let seq = 0;
  frames.forEach((f, i) => {
    const idat = Buffer.concat(chunks(f.png).filter((c) => c.type === 'IDAT').map((c) => c.data));
    parts.push(fcTL(seq++, w, h, Math.round(f.seconds * DEN), DEN));
    if (i === 0) parts.push(chunk('IDAT', idat));
    else {
      const n = Buffer.alloc(4); n.writeUInt32BE(seq++);
      parts.push(chunk('fdAT', Buffer.concat([n, idat])));
    }
  });
  parts.push(chunk('IEND', Buffer.alloc(0)));
  return { buffer: Buffer.concat(parts), w, h, frames: frames.length };
}
