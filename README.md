# Article

A design system for text-heavy software — docs, dev tools, dashboards, reading apps.
It looks like a well-set page, not an app.

<p align="center">
  <img src="docs/screenshots/web-light.png" alt="Article, light theme" width="49%">
  <img src="docs/screenshots/web-dark.png" alt="Article, dark theme" width="49%">
</p>

- Plain CSS. No build step, no dependencies, no framework.
- One light theme, two dark themes.
- Square corners, hairlines, no shadows.
- Every colour pair passes WCAG AA — and a script checks it, so it stays true.
- Works in English and Chinese.

## Try it

```sh
git clone https://github.com/gr13nka/article && cd article
python3 -m http.server 8770
```

Open <http://127.0.0.1:8770/demo/index.html>. That page is the whole system: a website,
three phone screens, and every component in every state. Use `http`, not `file://`.

Here's [the component gallery](docs/screenshots/gallery-light.png) if you'd rather just look.

## Use it

```html
<link rel="stylesheet" href="web/tokens.css">
<link rel="stylesheet" href="web/article.css">
<link rel="stylesheet" href="web/prose.css">   <!-- only for long-form text -->
```

```js
import { initTheme } from './web/theme.js';
const theme = initTheme();          // light / dark / follow the system
themeButton.addEventListener('click', theme.cycle);
```

That's the whole setup. Fonts and the no-flash snippet are in
[demo/index.html](demo/index.html) — copy the `<head>` from there.

`prose.css` styles plain HTML inside `.art-prose`, so rendered Markdown just works. No
classes needed.

## Make it your own

Article is a starting point, not a finished brand. **[FORK.md](FORK.md)** is the recipe.
Short version: six values decide how it feels.

Seen a design you like? Screenshot it and read the colours straight out of the image:

```sh
node tools/palette-from-image.mjs ref.png --roles
```

You get the colours, mapped to Article's roles, with the contrast already checked. Article's
own light theme was built this way.

Then:

```sh
node tools/check-sync.mjs --contrast
```

Green means you're done.

<p align="center">
  <img src="docs/screenshots/mobile-light.png" alt="Three phone screens" width="88%">
</p>

## What's where

| Path | |
|---|---|
| `web/tokens.css` | All the colours, type and spacing. **The file you edit** |
| `web/article.css` | Components — buttons, forms, tables, lists, app bars |
| `web/prose.css` | Long-form text |
| `web/theme.js` | Theme switching |
| `ornaments/` | The little marks — fleuron, checks, chevrons |
| `demo/index.html` | The showcase |
| `FORK.md` | How to re-skin it |
| `THEMING.md` | More detail on palettes and type |
| `STYLE.md` | The rules, and why they exist |
| `DECISIONS.md` | What was decided, and what was rejected |
| `tools/` | The contrast checker and the image sampler |

## Type

**Vollkorn** for headings, **Inter** for text, **JetBrains Mono** for code. Chinese falls
back to **Noto Serif SC**, **Noto Sans SC** and **Noto Sans Mono**.

If you change a font, keep the Latin one first in the stack. The Noto fonts include Latin
too, and will quietly take over the whole page if you put them first.

## Two rules worth knowing

**Colours are defined once**, using CSS `light-dark()`. So there's no second copy of the
palette to fall out of sync.

**Never put a colour inside a `data:` URI.** `currentColor` can't reach in there, so the
mark can never follow the theme. Icons live in `ornaments/` and are drawn with `mask-image`.
This one mistake is why a sibling project never got a dark mode.

## Licence

MIT. Use it, fork it, make it yours.
