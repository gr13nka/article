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
import { encodeAPNG } from './apng.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/screenshots');
const IMG = join(ROOT, 'docs/images');
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
   has no other use for. `from`/`to` clip the union of two elements, and `page`
   picks which demo page to shoot (default demo/index.html). */
const SHOTS = [
  // The hero alone is faithful to the reference but very sparse, which reads as
  // an empty page at README size. Hiding the hero puts the masthead directly
  // against the article, so one image carries the crimson bar, the display
  // serif, the drop cap and real text texture at once.
  { file: 'web-light.png',      w: 1440, theme: 'light', from: '.art-bar', to: '#article', hide: ['.demo-hero'], max: 1000 },
  { file: 'web-dark.png',       w: 1440, theme: 'dark',  from: '.art-bar', to: '#article', hide: ['.demo-hero'], max: 1000 },
  { file: 'web-catppuccin.png', w: 1440, theme: 'dark', dark: 'catppuccin', from: '.art-bar', to: '#article', hide: ['.demo-hero'], max: 1000 },
  { file: 'article-light.png',  w: 1440, theme: 'light', clip: '#article' },
  { file: 'index-light.png',    w: 1440, theme: 'light', clip: '#index' },
  // The gallery is ~10,000px tall, so it is sampled rather than captured whole:
  // 'sel@n' picks the nth match, and from/to clips the span between two of them.
  // The indices are positional: reorder the groups and this quietly becomes a
  // picture of two different components.
  { file: 'gallery-light.png',  w: 1440, theme: 'light', page: 'demo/gallery.html', from: '.demo-group@1', to: '.demo-group@3' },
  { file: 'mobile-light.png',   w: 1440, theme: 'light', clip: '.demo-phones-strip' },
  { file: 'mobile-dark.png',    w: 1440, theme: 'dark',  clip: '.demo-phones-strip' },
];

/* The demo's own furniture — the sticky theme and palette control — explains the
   kit to a reader of the page, but in a README screenshot it reads as clutter
   over the design. Hidden for the capture only. */
const HIDE_CHROME = `
  .demo-controls { display: none !important; }
  html { scroll-behavior: auto !important; }
`;

/*
 * The animations. A theme change in Article is instantaneous — the palette is
 * an attribute and nothing about a colour transitions — so a take is a list of
 * HELD STATES, not a recording. Three screenshots and three delays say
 * everything a sampled take would, at three frames instead of thirty-five.
 */
const TAKES = [
  {
    file: 'themes.png',
    page: 'demo/index.html',
    w: 960, h: 900, dsf: 1,
    // The phones have their own picture; hiding them puts the masthead at the
    // top of the page so the clip needs no scrolling.
    hide: ['.demo-phones-strip'],
    clip: { x: 0, y: 0, width: 960, height: 726 },
    hold: 1.3,
    states: [
      { theme: 'light' },
      { theme: 'dark' },
      { theme: 'dark', dark: 'catppuccin' },
    ],
  },
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
    const page = shot.page ?? 'demo/index.html';

    // Seed the page's own storage BEFORE any of its scripts run. Setting the
    // attribute after load is not enough: initTheme resolves `system` by
    // REMOVING data-theme, so whichever of the two runs last wins, and the
    // loser is a light-named file holding a dark picture.
    const { identifier } = await send(ws, 'Page.addScriptToEvaluateOnNewDocument', {
      source: `try{
        localStorage.setItem('art-theme', ${JSON.stringify(shot.theme)});
        localStorage.setItem('art-demo-dark', ${JSON.stringify(shot.dark ?? 'darcula')});
      }catch(e){}`,
    }, sessionId);

    await send(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/${page}${qs}` }, sessionId);
    await wait(1400);

    // Belt and braces: the storage seed decides the theme, this only restates it.
    await send(ws, 'Runtime.evaluate', { expression: `
      document.documentElement.setAttribute('data-theme', ${JSON.stringify(shot.theme)});
      ${shot.dark ? `document.documentElement.setAttribute('data-dark', ${JSON.stringify(shot.dark)});`
                  : `document.documentElement.removeAttribute('data-dark');`}
      document.fonts.ready.then(() => 1);
    `, awaitPromise: false }, sessionId);
    await wait(900);

    await send(ws, 'Page.removeScriptToEvaluateOnNewDocument', { identifier }, sessionId);

    // A picture in the wrong theme is the one failure this script cannot see,
    // because every other symptom of it still writes a plausible-looking PNG.
    const seen = await send(ws, 'Runtime.evaluate', { expression: `
      JSON.stringify({
        theme: document.documentElement.getAttribute('data-theme'),
        dark: document.documentElement.getAttribute('data-dark'),
      })
    `, returnByValue: true }, sessionId);
    const got = JSON.parse(seen.result.value);
    if (got.theme !== shot.theme || (got.dark ?? undefined) !== shot.dark) {
      throw new Error(`${shot.file}: page settled on theme=${got.theme} dark=${got.dark}, `
        + `expected theme=${shot.theme} dark=${shot.dark ?? 'none'}`);
    }

    const box = await send(ws, 'Runtime.evaluate', { expression: `
      (() => {
        const st = document.createElement('style');
        st.textContent = ${JSON.stringify(HIDE_CHROME)}
          + ${JSON.stringify((shot.hide ?? []).join(','))}.split(',').filter(Boolean)
              .map((s) => s + '{display:none !important}').join('');
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
      params.clip = { x: b.x, y: Math.max(0, b.y), width: b.width,
                      height: Math.min(b.height, shot.max ?? 2400), scale: 1 };
    } else {
      // Naming the selector that was actually asked for: shot.clip is undefined
      // on every from/to shot, which is most of them.
      console.log(`    (no element for ${shot.clip ?? `${shot.from} -> ${shot.to}`} in ${page} — full viewport instead)`);
    }

    const { data } = await send(ws, 'Page.captureScreenshot', params, sessionId);
    const file = join(OUT, shot.file);
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(`  ${shot.file.padEnd(22)} ${(statSync(file).size / 1024).toFixed(0).padStart(5)} KB`);
  }

  for (const take of TAKES) {
    await send(ws, 'Emulation.setDeviceMetricsOverride',
      { width: take.w, height: take.h, deviceScaleFactor: take.dsf ?? 2, mobile: false }, sessionId);

    // Seeded light, then driven by attribute. The load-time race the shots
    // guard against is over by the time the first state is set.
    const { identifier } = await send(ws, 'Page.addScriptToEvaluateOnNewDocument', {
      source: `try{localStorage.setItem('art-theme','light');localStorage.setItem('art-demo-dark','darcula');}catch(e){}`,
    }, sessionId);
    await send(ws, 'Page.navigate', { url: `http://127.0.0.1:${PORT}/${take.page}` }, sessionId);
    await wait(1600);
    await send(ws, 'Page.removeScriptToEvaluateOnNewDocument', { identifier }, sessionId);

    await send(ws, 'Runtime.evaluate', { expression: `
      const st = document.createElement('style');
      st.textContent = ${JSON.stringify(HIDE_CHROME)}
        + ${JSON.stringify(take.hide.join(','))} + '{display:none !important}';
      document.head.appendChild(st);
      scrollTo(0, 0);
      document.fonts.ready.then(() => 1);
    `, awaitPromise: false }, sessionId);
    await wait(900);

    const frames = [];
    for (const state of take.states) {
      await send(ws, 'Runtime.evaluate', { expression: `
        document.documentElement.setAttribute('data-theme', ${JSON.stringify(state.theme)});
        ${state.dark ? `document.documentElement.setAttribute('data-dark', ${JSON.stringify(state.dark)});`
                     : `document.documentElement.removeAttribute('data-dark');`}
      `, returnByValue: true }, sessionId);
      await wait(450);
      const { data } = await send(ws, 'Page.captureScreenshot',
        { format: 'png', captureBeyondViewport: true, clip: { ...take.clip, scale: 1 } }, sessionId);
      frames.push({ png: Buffer.from(data, 'base64'), seconds: take.hold });
    }

    const { buffer, w, h, frames: n } = encodeAPNG(frames);
    mkdirSync(IMG, { recursive: true });
    const file = join(IMG, take.file);
    writeFileSync(file, buffer);
    console.log(`  ${take.file.padEnd(22)} ${(buffer.length / 1024).toFixed(0).padStart(5)} KB  ${w}x${h}, ${n} frames`);
  }

  ws.close(); proc.kill(); server.close();
  // Chrome may still be flushing its profile as it exits; a failed tmp cleanup
  // must not fail a successful run.
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
  console.log(`\n  ${SHOTS.length} screenshots in docs/screenshots/, ${TAKES.length} animation in docs/images/\n`);
}

main().catch((e) => { console.error(`shoot: ${e.message}`); process.exit(1); });
