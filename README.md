# Article

A formal, editorial design system for software that is mostly words — reading tools,
developer tools, documentation, dashboards, admin surfaces. It reads like a well-set page
rather than like an app: the authority comes from typography and whitespace, not from chrome.

**Light and dark are both first class.** Light is an editorial print palette; dark is a
neutral, faintly warm grey with a low-chroma red. Every documented text-on-surface pair
clears WCAG AA in both, and a checker in the repo proves it. Four alternate dark grounds
(including JetBrains Darcula) and four accents ship pre-checked — see THEMING.md.

- Plain CSS. **No build step, no dependencies, no framework.**
- Two-layer design tokens — re-colour the entire system by editing one file.
- Squared off, hairlines, no shadows, no gradients.
- A display serif over a humanist sans, and one accent colour spent structurally.
- Sets **English and Simplified Chinese** out of the box.

## Quick start

```html
<head>
  <!-- Set the theme before first paint, or the page flashes. -->
  <script>
    (function(){try{var m=localStorage.getItem('art-theme');
    if(m==='light'||m==='dark')document.documentElement.setAttribute('data-theme',m);}catch(e){}})();
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Vollkorn:ital,wght@0,400..900;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <!-- Chinese. Served in ~300 unicode-range slices, so a page with no Chinese
       on it downloads none of these files. Drop the line if you never need CJK. -->
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Sans+Mono:wght@400&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="web/tokens.css">
  <link rel="stylesheet" href="web/article.css">
  <link rel="stylesheet" href="web/prose.css">   <!-- only if you render long-form text -->
</head>
```

```js
import { initTheme } from './web/theme.js';
const theme = initTheme();
document.querySelector('#theme-toggle').addEventListener('click', theme.cycle);
```

That is the whole integration. Themes are handled by `color-scheme` and CSS `light-dark()`,
so no component ever branches on which theme is active.

## Try it

```sh
python3 -m http.server 8770      # from the repo root
```

| Page | What it is |
|---|---|
| `demo/index.html` | The showcase — an editorial website plus three phone screens, both themes |
| `demo/type.html` | Typography sampler: candidate font pairings, Latin and Cyrillic side by side |
| `demo/theme.html` | The comparison page used to settle the dark masthead |

Serve over http — ES modules do not load from `file://`.

## Make it yours

Read **[THEMING.md](THEMING.md)**. The short version: components only ever reference
*semantic roles* (`--art-accent`, `--art-ink`, `--art-surface`), and each role is declared
once in `web/tokens.css` with both its light and dark value on one line. Re-point the roles
and the whole system follows — you never touch a component.

```sh
node tools/check-sync.mjs --contrast   # prints every pair in both themes, fails below AA
```

## What's in here

| Path | What it is |
|---|---|
| `STYLE.md` | The constitution — palette, type, the ornament contract, the rules |
| `DECISIONS.md` | Append-only log: every decision, why, and what was rejected |
| `THEMING.md` | How to re-colour and re-type the system |
| `web/tokens.css` | All `--art-*` tokens. The one file you edit to make it yours |
| `web/article.css` | Component classes (`.art-btn`, `.art-bar`, `.art-table`, …) |
| `web/prose.css` | Long-form reading layer — styles bare HTML under `.art-prose` |
| `web/theme.js` | Theme control: light / dark / follow-the-system |
| `ornaments/` | The marks — fleuron, dinkus, check, chevron. Geometric, mirror-symmetric |
| `tools/check-sync.mjs` | Drift checker and contrast gate. Report-only, exits non-zero on a problem |

## Type

The default Latin pairing is **Vollkorn** (display serif), **Inter** (body sans)
and **JetBrains Mono** (code). Chinese falls through to **Noto Serif SC**, **Noto Sans SC**
and **Noto Sans Mono**.

Each token is a stack with the Latin face first and the CJK face second, because both Noto
SC families carry full Latin glyphs and would otherwise take over the page. All six are
swappable in one token each — see [THEMING.md](THEMING.md).

## Design notes

Two rules carry more weight than the rest, and both exist because of specific failures:

**Every semantic colour is declared exactly once, via `light-dark()`.** The alternative — a
`prefers-color-scheme` block plus a `[data-theme]` block — requires the dark palette to be
written twice, in two places that drift. The checker fails the build on any semantic colour
that skips `light-dark()`.

**No colour is ever baked into a `data:` URI.** `currentColor` cannot reach inside a data
URI, so a mark defined that way can never follow the theme or the accent. Every mark lives
in `ornaments/` and is applied with `mask-image` + `background-color: currentColor`. This
single defect is what kept a sibling project from ever shipping a dark mode.

## Licence

MIT — see [LICENSE](LICENSE). Use it, fork it, rebuild it in your own colours.
