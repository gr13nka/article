#!/usr/bin/env node
/**
 * Article — regenerate the README screenshots.
 *
 * These are committed to the repo (GitHub needs them in-repo to render), which
 * makes them the one artefact here that can silently go stale. So they are
 * produced by a script rather than by hand: after any design change, run this
 * and the pictures match the code again.
 *
 *   node tools/shoot.mjs
 *
 * Drives the Chromium that Playwright has already cached, over the DevTools
 * protocol, using Node's built-in WebSocket. No npm install, in keeping with
 * the rest of tools/.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/screenshots');
const PORT = 8899;

const MIME = { html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml', png: 'image/png' };

function findBrowser() {
  const cache = join(homedir(), 'Library/Caches/ms-playwright');
  const candidates = [];
  if (existsSync(cache)) {
    for (const d of readdirSync(cache)) {
      for (const p of [
        join(cache, d, 'chrome-headless-shell-mac-x64/chrome-headless-shell'),
        join(cache, d, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'),
        join(cache, d, 'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
        join(cache, d, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      ]) if (existsSync(p)) candidates.push(p);
    }
  }
  for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                   '/Applications/Chromium.app/Contents/MacOS/Chromium']) {
    if (existsSync(p)) candidates.push(p);
  }
  if (!candidates.length) throw new Error('no Chromium found — install Chrome, or run `npx playwright install chromium`');
  return candidates[0];
}

/* Each shot: a viewport, a theme, an optional dark palette, and the element to
   frame. Clipping to a selector rather than capturing the full page is what
   keeps these legible in a README at 49% width. */
const SHOTS = [
  { file: 'web-light.png',      w: 1440, h: 1100, theme: 'light', clip: '[data-shot="hero"]' },
  { file: 'web-dark.png',       w: 1440, h: 1100, theme: 'dark',  clip: '[data-shot="hero"]' },
  { file: 'web-catppuccin.png', w: 1440, h: 1100, theme: 'dark', dark: 'catppuccin', clip: '[data-shot="hero"]' },
  { file: 'article-light.png',  w: 1440, h: 1400, theme: 'light', clip: '[data-shot="article"]' },
  { file: 'index-light.png',    w: 1440, h: 1400, theme: 'light', clip: '[data-shot="index"]' },
  { file: 'gallery-light.png',  w: 1440, h: 1600, theme: 'light', clip: '[data-shot="gallery"]' },
  { file: 'mobile-light.png',   w: 1440, h: 1100, theme: 'light', clip: '[data-shot="phones"]' },
  { file: 'mobile-dark.png',    w: 1440, h: 1100, theme: 'dark',  clip: '[data-shot="phones"]' },
];

const send = (() => {
  let id = 0;
  return (ws, method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const msgId = ++id;
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== msgId) return;
      ws.removeEventListener('message', onMsg);
      m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result);
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id: msgId, method, params, sessionId }));
  });
})();

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  mkdirSync(OUT, { recursive: true });

  const server = createServer(async (req, res) => {
    const path = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    try {
      const body = await readFile(path);
      res.writeHead(200, { 'Content-Type': MIME[path.split('.').pop()] ?? 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

  const bin = findBrowser();
  console.log(`  browser: ${bin.split('/').slice(-1)[0]}`);
  const proc = spawn(bin, ['--headless=new', '--remote-debugging-port=9333', '--hide-scrollbars',
    '--force-color-profile=srgb', '--disable-gpu', '--no-sandbox', 'about:blank'], { stdio: 'ignore' });

  let wsUrl;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    await wait(250);
    try { wsUrl = (await (await fetch('http://127.0.0.1:9333/json/version')).json()).webSocketDebuggerUrl; } catch {}
  }
  if (!wsUrl) { proc.kill(); server.close(); throw new Error('browser did not expose a debugging port'); }

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const { targetId } = await send(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send(ws, 'Target.attachToTarget', { targetId, flatten: true });
  await send(ws, 'Page.enable', {}, sessionId);
  await send(ws, 'Runtime.enable', {}, sessionId);

  for (const shot of SHOTS) {
    await send(ws, 'Emulation.setDeviceMetricsOverride',
      { width: shot.w, height: shot.h, deviceScaleFactor: 2, mobile: false }, sessionId);

    const qs = `?theme=${shot.theme}${shot.dark ? `&dark=${shot.dark}` : ''}`;
    await send(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/demo/index.html${qs}` }, sessionId);
    await wait(1400);

    // The demo persists theme in localStorage; force it explicitly so a shot
    // never inherits whatever the previous one left behind.
    await send(ws, 'Runtime.evaluate', { expression: `
      document.documentElement.setAttribute('data-theme', ${JSON.stringify(shot.theme)});
      ${shot.dark ? `document.documentElement.setAttribute('data-dark', ${JSON.stringify(shot.dark)});`
                  : `document.documentElement.removeAttribute('data-dark');`}
      document.fonts.ready.then(() => 1);
    `, awaitPromise: false }, sessionId);
    await wait(900);

    const box = await send(ws, 'Runtime.evaluate', { expression: `
      (() => { const el = document.querySelector(${JSON.stringify(shot.clip)});
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return JSON.stringify({ x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }); })()
    `, returnByValue: true }, sessionId);

    const params = { format: 'png', captureBeyondViewport: true };
    if (box.result.value) {
      const b = JSON.parse(box.result.value);
      params.clip = { x: b.x, y: b.y, width: b.width, height: Math.min(b.height, 2200), scale: 1 };
    } else {
      console.log(`    (no element for ${shot.clip} — full viewport instead)`);
    }

    const { data } = await send(ws, 'Page.captureScreenshot', params, sessionId);
    const file = join(OUT, shot.file);
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(`  ${shot.file.padEnd(22)} ${(statSync(file).size / 1024).toFixed(0).padStart(5)} KB`);
  }

  ws.close(); proc.kill(); server.close();
  console.log(`\n  ${SHOTS.length} screenshots in docs/screenshots/\n`);
}

main().catch((e) => { console.error(`shoot: ${e.message}`); process.exit(1); });
