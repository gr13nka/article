# Making Article yours

Article is meant to be re-coloured. The whole system is built so that you change values in
**one file** — `web/tokens.css` — and every component, both themes, follows.

Before you start, the one idea you need:

> **Primitives are raw colours. Semantic roles are jobs.**
> Components only ever reference *jobs*. So you re-colour the system by changing what a job
> points at — never by touching a component.

```
  --art-c-crimson-700: #7F0002;        <- a primitive: just a colour
  --art-ctp-red:       #F38BA8;

  --art-accent: light-dark(            <- a role: "the structural accent"
      var(--art-c-crimson-700),          light value
      var(--art-ctp-red));               dark value

  .art-bar__mark { color: var(--art-bar-mark); }   <- a component. Never a raw colour.
```

`light-dark()` picks the first value under a light `color-scheme` and the second under dark.
Both live on one line, so the two themes cannot drift apart.

---

## Change just the accent — about five minutes

This is the most common change, and it is the one the system is designed for. Article's
accent is a deep crimson; suppose you want forest green.

Open `web/tokens.css`. Add your primitives next to the existing ones:

```css
  --art-c-green-700: #14532D;   /* dark enough to carry white text */
  --art-c-green-500: #197A46;   /* brighter — small filled controls need chroma */
```

Then re-point the four accent roles. Nothing else changes:

```css
  --art-accent:        light-dark(var(--art-c-green-700), var(--art-ctp-green));
  --art-accent-strong: light-dark(var(--art-c-green-500), var(--art-ctp-green));
  --art-accent-ink:    light-dark(#FFFFFF,                var(--art-ctp-crust));
  --art-link:          light-dark(var(--art-c-green-700), var(--art-ctp-green));
```

You will usually want the masthead to follow:

```css
  --art-bar:      light-dark(var(--art-c-green-700), var(--art-ctp-mantle));
  --art-bar-mark: light-dark(#FFFFFF,                var(--art-ctp-green));
  --art-bar-edge: light-dark(transparent,            var(--art-ctp-green));
```

Then **run the checker**:

```sh
node tools/check-sync.mjs --contrast
```

It prints every text-on-surface pair in both themes and fails if any drops below WCAG AA.
This is the step people skip and regret: a colour that looks fine in light is very often
unreadable in dark, and vice versa.

### The one trap

**Do not derive your dark value by darkening or lightening your light value.** In light, an
accent is usually a dark fill carrying white text. In dark, it is usually a *light* value
carrying near-black text. The role is the same; the contrast direction inverts. Pick the
value that does the job in that theme — see `STYLE.md` §1, "The accent role flip".

---

## Change the whole palette — about fifteen minutes

Replace the primitive block wholesale. You need, at minimum:

| Role you must supply | Light | Dark |
|---|---|---|
| `--art-surface` | your page ground | your dark ground |
| `--art-surface-raised` | one step up | one step up |
| `--art-surface-sunken` | one step down | one step down |
| `--art-ink-strong` | headline ink | headline ink |
| `--art-ink` | body ink | body ink |
| `--art-ink-muted` | caption ink | caption ink |
| `--art-rule` | hairline | hairline |
| `--art-accent`, `--art-accent-strong`, `--art-accent-ink` | | |
| `--art-action`, `--art-action-ink` | | |
| `--art-danger`, `--art-success`, `--art-warning` | | |

Two pieces of advice from building the default palette:

**Keep the paper and the ink at different temperatures.** Article's paper is warm
(`#FCFBF9`) and its ink is cool (`#181E2A`). That slight tension is what stops a
black-on-white page from feeling clinical. Matching them exactly tends to look flat.

**If you are using a ready-made dark palette** (Catppuccin, Rosé Pine, Nord, Gruvbox), use
its surface ramp for elevation instead of reaching for shadows. Article forbids
`box-shadow`, and a good dark palette already ships three or four surface steps that do the
job better.

### The two dark palettes

Article ships two, and switching between them is one attribute:

```html
<html>                        <!-- Darcula, the default -->
<html data-dark="catppuccin"> <!-- Catppuccin Mocha -->
```

Both are defined in `web/tokens.css` as `--art-dk-*` primitive blocks, and both are measured
by `node tools/check-sync.mjs --contrast`, which runs a separate pass per palette.

### Adding your own dark palette

Copy the `[data-dark="catppuccin"]` block, rename it, and change the fifteen values. **No
semantic role is redeclared and no component is touched** — that is the entire mechanism.
The checker discovers your block automatically and holds it to the same floor as the others.

Three things to get right, learned from doing it twice:

**Check the secondary surfaces, not just the background.** Article's Darcula `raised` is
`#35383A`, not JetBrains' own panel grey `#3C3F41` — that colour puts muted text at 3.69:1,
below AA. Editor themes tune their editor background carefully and their panel chrome much
less so.

**Re-tune a borrowed accent against your ground.** One Dark's `#E06C75` measures 4.431:1 on
Darcula's page — just under the floor, because it was tuned against One Dark's own darker
background. A 0.6% lightness lift with hue and saturation held exactly fixes it at 4.55:1
while remaining visually the same colour.

**Keep danger away from the accent in chroma, not just hue.** If your accent is a red, your
danger colour needs real separation from it (aim for ΔE ≥ 40) or an error state becomes
indistinguishable from ordinary emphasis — the error still shows, it just stops meaning
anything. Catppuccin Mocha has only one red, which is why Article changes exactly one value
from the upstream flavour.

### Which of the two to use

Darcula is the default because its neutral grey sits closer to the light theme's warm paper,
so the two themes read as one system. Catppuccin's base is distinctly blue-purple and its red
is a pastel pink — a different voice, and a very familiar one to developers, which is exactly
why it is worth having available rather than arguing about.

---

## Change the type

```css
  --art-font-display: 'Your Serif', 'Noto Serif SC', Georgia, serif;
  --art-font-body:    'Your Sans', 'Noto Sans SC', system-ui, sans-serif;
  --art-font-mono:    'Your Mono', 'Noto Sans Mono', ui-monospace, monospace;
```

**Keep your Latin face first.** The CJK families carry full Latin glyph sets, so a stack
that lists them first will render your entire English text in them without warning. The
browser falls through to the CJK face only for codepoints your Latin face cannot draw.

Then update the `<link>` in your pages, and check two things by eye:

- **The drop cap.** `.art-dropcap` in `web/article.css` is tuned to the metrics of the
  default display face. A different serif will need its `font-size` and `line-height` nudged
  so the cap still sits on the third baseline.
- **The measure.** `--art-measure` is `68ch`, and `ch` is relative to *your* font. A wider
  face will produce a physically wider column at the same `ch` value.

If your project needs Cyrillic, Greek, Devanagari or another script, verify the family
actually ships that subset before committing to it — and if it does not, add a Noto face for
that script to the stack the same way Chinese is handled above. `demo/type.html` is a
ready-made comparison page: point it at your candidates and look at them side by side rather
than deciding from a specimen image.

---

## What not to change

These are what make the result still look like one system rather than a pile of settings:

- **Don't reference a primitive from a component.** If a component needs a colour that has no
  role, add the role.
- **Don't round a corner.** `--art-radius` is `0` on purpose. If you do want soft corners,
  change that one token — do not add a radius to individual components.
- **Don't add a `box-shadow`.** Use `--art-surface-raised` and a hairline.
- **Don't bake a colour into a `data:` URI.** Marks live in `ornaments/` and are applied with
  `mask-image` + `background-color: currentColor`, so they follow the theme. The checker
  fails the build on this, and the reason is a real bug that cost a sibling project its dark
  mode entirely.
- **Don't add a second accent.** One accent, spent everywhere it belongs, is the whole idea.

---

## Verify

```sh
node tools/check-sync.mjs             # drift + invariants
node tools/check-sync.mjs --contrast  # the full WCAG table, both themes
python3 -m http.server 8770           # then open the preview at /demo/ — never file://
```

The checker is report-only and never writes anything. It exits non-zero on a problem, so it
works as a pre-commit hook or a CI step.
