# Forking Article

Article is a **starting point**, not a finished brand. It is built to be re-skinned by a
person and an LLM working together from reference images — which is exactly how Article
itself was made, by sampling screenshots of a site whose typography we liked.

This file is the whole recipe. **You do not need to read `STYLE.md` to re-skin the kit.**

---

## The short version

Six values decide whether a fork feels like a different system. Everything else can stay.

| Token | In `web/tokens.css` | What it is |
|---|---|---|
| `--art-c-paper-0` | light primitives | the page, light |
| `--art-c-ink-700` | light primitives | body text, light |
| `--art-c-crimson-700` | light primitives | **the accent**, light |
| `--art-dk-page` | dark primitives | the page, dark |
| `--art-dk-accent` | dark primitives | **the accent**, dark |
| `--art-font-display` / `--art-font-body` | type | the two faces |

Change those, run the checker, and you have a different design system.

```sh
node tools/check-sync.mjs --contrast
```

That command is the **stop condition**. It measures every text-on-surface pair in every
palette and fails below WCAG AA. A fork is finished when it is green.

---

## Working from a reference image

Screenshot the design you want to borrow from, then read the colours out of it rather than
guessing them from a description:

```sh
node tools/palette-from-image.mjs ref.png --roles
```

You get the dominant colours with hue/saturation/lightness, a suggested mapping onto Article's
roles, and **the contrast of each suggestion already measured** — so an unusable colour is
rejected before you adopt it, not after.

The flag that matters is `--box`, because the colour you actually want is almost never the
most common pixel on the page:

```sh
node tools/palette-from-image.mjs ref.png --box 1240,500,1480,540   # just the button
```

Sample the masthead, the buttons, a heading, and the page ground as separate regions. That is
four commands and it gives you the whole palette.

---

## Then

1. Put the values into the **primitive** blocks in `web/tokens.css` — the `--art-c-*` (light)
   and `--art-dk-*` (dark) groups near the top. Do not touch anything below them.
2. Run `node tools/check-sync.mjs --contrast`. Fix whatever it flags (see the traps below).
3. If you changed either font, re-derive the drop cap — three lines of arithmetic, in
   `STYLE.md` §3 and in a comment above `.art-dropcap` in `web/article.css`.
4. Look at `demo/index.html` in both themes. That is the whole system on one page.

---

## The rules that keep it coherent

Break these and the result stops being a design system and becomes a pile of settings.

- **Components never reference a primitive.** They use semantic roles (`--art-accent`,
  `--art-ink`, `--art-surface`). If you need a colour that has no role, add the role.
- **Every semantic colour is declared once, via `light-dark()`.** Never redeclare a palette
  in a `prefers-color-scheme` block — two copies drift, one cannot.
- **No colour inside a `data:` URI.** `currentColor` cannot reach in, so such a mark can never
  follow the theme. Marks live in `ornaments/` and are applied with `mask-image` +
  `background-color: currentColor`.
- **No literal `border-radius`.** Use `var(--art-radius)`. Want soft corners? Change that one
  token and every component follows.
- **No `box-shadow`, no gradients.** Depth comes from hairlines and surface steps.
- **One accent.** Spent everywhere it belongs. A second one halves the meaning of the first.

---

## Four traps, each already paid for

These cost real debugging time to find. They will cost you the same if you rediscover them.

**A borrowed accent was tuned against someone else's background.** Expect it to miss your
contrast floor by a hair. The fix is a minimal *lightness* lift with hue and saturation held
exactly — which keeps it visually the same colour. Article's own dark accent is One Dark's
`#E06C75` lifted 0.6% to `#E16F77`: three units out of 255 on two channels, and the
difference between 4.43:1 and 4.55:1. `palette-from-image.mjs` computes this lift for you and
prints it.

**Check a borrowed palette's secondary surfaces, not just its background.** Editor themes tune
their editor background with great care and their panel chrome barely at all. JetBrains
Darcula's own panel grey `#3C3F41` puts muted text at 3.69:1 — below AA — which is why
Article's Darcula uses `#35383A` instead.

**Keep danger away from the accent in chroma, not merely in hue.** If your accent is a red,
your error colour needs real separation from it — aim for a distance of 40+ in RGB. Otherwise
the error state still *shows*, it just stops *meaning* anything. Catppuccin Mocha ships only
one red, which is why Article changes exactly one value from the upstream flavour.

**A saturated crimson cannot reach 4.5:1 on a dark ground.** Article's light accent `#7F0002`
manages 1.51:1 there, and at full saturation anything clearing 4.5:1 is forced toward scarlet.
So dark accents are lighter and lower-chroma by necessity. **Your light and dark accent share
a role, not a hue** — do not try to make them the same colour.

---

## Adding a whole dark palette

Copy the `[data-dark="catppuccin"]` block in `web/tokens.css`, rename it, change the fifteen
values. No semantic role is redeclared and no component is touched — that is the entire
mechanism. The checker discovers your block automatically and holds it to the same floor as
the others.

```html
<html data-dark="yourpalette">
```

---

## Going further

`THEMING.md` has the longer version of all of this. `STYLE.md` is the constitution — read it
when you want to know *why* a rule exists, not to follow this recipe. `DECISIONS.md` records
every choice and what was rejected, which is the file to check before re-litigating something.
