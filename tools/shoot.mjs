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
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
  // chrome-headless-shell first: it exists precisely to be driven over CDP and
  // opens its debugging port without argument. Full Chrome is the fallback.
  const shells = [], fulls = [];
  if (existsSync(cache)) {
    for (const d of readdirSync(cache)) {
      for (const p of [
        join(cache, d, 'chrome-headless-shell-mac-x64/chrome-headless-shell'),
        join(cache, d, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'),
      ]) if (existsSync(p)) shells.push(p);
      for (const p of [
        join(cache, d, 'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
        join(cache, d, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      ]) if (existsSync(p)) fulls.push(p);
    }
  }
  const candidates = [...shells, ...fulls];
  for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                   '/Applications/Chromium.app/Contents/MacOS/Chromium']) {
    if (existsSync(p)) candidates.push(p);
  }
  if (!candidates.length) throw new Error('no Chromium found — install Chrome, or run `npx playwright install chromium`');
  return candidates[0];
}

/* Each shot names existing elements in the demo rather than requiring markers
   in the markup — taking pictures should not make the page carry attributes it
   has no other use for. `from`/`to` clip the union of two elements. */
const SHOTS = [
  { file: 'web-light.png',      w: 1440, theme: 'light', from: '.art-bar', to: '.demo-hero' },
  { file: 'web-dark.png',       w: 1440, theme: 'dark',  from: '.art-bar', to: '.demo-hero' },
  { file: 'web-catppuccin.png', w: 1440, theme: 'dark', dark: 'catppuccin', from: '.art-bar', to: '.demo-hero' },
  { file: 'article-light.png',  w: 1440, theme: 'light', clip: '#article' },
  { file: 'index-light.png',    w: 1440, theme: 'light', clip: '#index' },
  // The gallery is ~10,000px tall, so it is sampled rather than captured whole:
  // 'sel@n' picks the nth match, and from/to clips the span between two of them.
  { file: 'gallery-light.png',  w: 1440, theme: 'light', from: '.demo-group@1', to: '.demo-group@3' },
  { file: 'mobile-light.png',   w: 1440, theme: 'light', clip: '.demo-phones-strip' },
  { file: 'mobile-dark.png',    w: 1440, theme: 'dark',  clip: '.demo-phones-strip' },
];

/* The demo's own furniture — the sticky control strip and the little class-name
   annotations — explains the kit to a reader of the page, but in a README
   screenshot it reads as clutter over the design. Hidden for the capture only. */
const HIDE_CHROME = `
  .demo-controls, .demo-marker { display: none !important; }
  html { scroll-behavior: auto !important; }
`;

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
  const profile = mkdtempSync(join(tmpdir(), 'article-shoot-'));
  const args = ['--remote-debugging-port=9333', `--user-data-dir=${profile}`, '--hide-scrollbars',
    '--force-color-profile=srgb', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions',
    // Keep the browser away from the OS keychain. Without these, Chrome asks
    // macOS for its "Safe Storage" key on a fresh profile so it can encrypt
    // cookies and passwords — an alarming prompt, and completely pointless for
    // a throwaway profile that only ever loads localhost and takes pictures.
    '--use-mock-keychain', '--password-store=basic',
    '--disable-sync', '--disable-features=Translate,MediaRouter',
    'about:blank'];
  if (!bin.includes('chrome-headless-shell')) args.unshift('--headless=new');
  const proc = spawn(bin, args, { stdio: 'ignore' });

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
      { width: shot.w, height: 1200, deviceScaleFactor: 2, mobile: false }, sessionId);

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
      (() => {
        const st = document.createElement('style');
        st.textContent = ${JSON.stringify(HIDE_CHROME)};
        document.head.appendChild(st);
        const q = (s) => {
          const at = s.lastIndexOf('@');
          if (at === -1) return document.querySelector(s);
          return document.querySelectorAll(s.slice(0, at))[Number(s.slice(at + 1))] ?? null;
        };
        const a = q(${JSON.stringify(shot.from ?? shot.clip)});
        const b = ${shot.to ? `q(${JSON.stringify(shot.to)})` : 'a'};
        if (!a || !b) return null;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const top = Math.min(ra.top, rb.top) + scrollY;
        const bottom = Math.max(ra.bottom, rb.bottom) + scrollY;
        return JSON.stringify({ x: 0, y: top, width: innerWidth, height: bottom - top });
      })()
    `, returnByValue: true }, sessionId);

    const params = { format: 'png', captureBeyondViewport: true };
    if (box.result.value) {
      const b = JSON.parse(box.result.value);
      params.clip = { x: b.x, y: Math.max(0, b.y), width: b.width, height: Math.min(b.height, 2400), scale: 1 };
    } else {
      console.log(`    (no element for ${shot.clip} — full viewport instead)`);
    }

    const { data } = await send(ws, 'Page.captureScreenshot', params, sessionId);
    const file = join(OUT, shot.file);
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(`  ${shot.file.padEnd(22)} ${(statSync(file).size / 1024).toFixed(0).padStart(5)} KB`);
  }

  ws.close(); proc.kill(); server.close();
  // Chrome may still be flushing its profile as it exits; a failed tmp cleanup
  // must not fail a successful run.
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
  console.log(`\n  ${SHOTS.length} screenshots in docs/screenshots/\n`);
}

main().catch((e) => { console.error(`shoot: ${e.message}`); process.exit(1); });
