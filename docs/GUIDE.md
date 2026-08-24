# Using Article

How to get the kit into a project and keep it there. For re-colouring it, see
[FORK.md](../FORK.md) and [THEMING.md](../THEMING.md); for the rules and the reasoning, see
[STYLE.md](../STYLE.md).

- [Install](#install)
- [The three optional files](#the-three-optional-files)
- [A theme switch of your own](#a-theme-switch-of-your-own)
- [Reuse your fork across projects](#reuse-your-fork-across-projects)
- [Type](#type)
- [Two rules that are easy to break](#two-rules-that-are-easy-to-break)
- [What's where](#whats-where)

## Install

Copy `web/` and `ornaments/` into your project, **side by side**. `article.css` reaches the
marks at `../ornaments/`, and they vanish silently if you flatten that layout.

```html
<link rel="stylesheet" href="web/tokens.css">
<link rel="stylesheet" href="web/article.css">
```

That is enough. `tokens.css` sets `color-scheme: light dark`, so the page follows the OS
from the first paint.

## The three optional files

| | |
|---|---|
| `web/prose.css` | Styles bare HTML inside `.art-prose` — rendered Markdown, no classes |
| `web/theme.js` | Only if you want a light / dark / system switch of your own |
| The webfonts | The stacks fall back to Georgia and system-ui, so skipping them degrades rather than breaks |

For the last two, copy the `<head>` from [index.html](../index.html): it has the font link and
the no-flash snippet, which has to run before the first stylesheet or the page flashes the
wrong theme on load.

## A theme switch of your own

```js
import { initTheme } from './web/theme.js';
const theme = initTheme();          // light / dark / follow the system
themeButton.addEventListener('click', theme.cycle);
```

`initTheme` returns `{ set, cycle, mode, resolved }` and keeps `system` live by listening to
`prefers-color-scheme`, so a page left on "follow the system" changes when the OS does.

## Reuse your fork across projects

Vendor it, so one change to your style reaches everything you have built:

```sh
git submodule add https://github.com/YOU/article vendor/article
```

```html
<link rel="stylesheet" href="vendor/article/web/tokens.css">
<link rel="stylesheet" href="vendor/article/web/article.css">
```

A submodule keeps `web/` and `ornaments/` siblings for you. `git submodule update --remote`
pulls your later changes into every project that uses it.

## Type

**Vollkorn** headings, **Inter** text, **JetBrains Mono** code. Chinese falls back to
**Noto Serif SC**, **Noto Sans SC** and **Noto Sans Mono**.

Keep the Latin face first in the stack. The Noto fonts include Latin and will take over the
whole page if you put them first.

Changing the display face invalidates the drop cap, which is derived from that face's cap
height. The three lines to redo are in [STYLE.md](../STYLE.md) §3.

## Two rules that are easy to break

**Colours are defined once**, with `light-dark()`. No second copy to fall out of sync.

**Never put a colour in a `data:` URI.** `currentColor` can't reach inside, so the mark can
never follow the theme. Marks live in `ornaments/` and are drawn with `mask-image`.

`node tools/check-sync.mjs` fails the build on the second one.

## What's where

| Path | |
|---|---|
| `web/tokens.css` | Colours, type, spacing. **The file you edit** |
| `web/article.css` | Components — buttons, forms, tables, lists, app bars |
| `web/prose.css` | Long-form text |
| `web/theme.js` | Theme switching |
| `ornaments/` | The marks — fleuron, checks, chevrons |
| `demo/index.html` | The preview |
| `demo/gallery.html` | Every component, every state |
| `demo/type.html` | Typeface sampler |
| `FORK.md` | How to re-skin it. **Hand this to your agent** |
| `CLAUDE.md` | The rules an agent breaks by accident |
| `STYLE.md` | The rules, and why |
| `THEMING.md` | Palettes and type, in more detail |
| `DECISIONS.md` | What was decided, and what was rejected |
| `tools/` | Contrast gate, palette sampler, screenshot script |
