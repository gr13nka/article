# Article — Style Constitution

Article is a formal, editorial design language for software that is mostly words:
reading tools, developer tools, documentation, dashboards, admin surfaces. It reads like
a well-set page rather than like an app — the authority comes from typography and
whitespace, not from chrome.

It is modelled on the design of `masteringemacs.org`, and its light palette is taken
directly from that site.

Three pillars hold the system up:

- **The page.** A plain ground with generous margins and a controlled measure. There are
  no cards floating over a background, no panels, no elevation. Structure is expressed by
  hairlines, by space, and by type.
- **Two voices.** A high-contrast display serif carries every heading; a humanist sans
  carries everything a reader reads to get information. The serif supplies the formality;
  the sans keeps it modern and legible at small sizes.
- **One structural accent.** A single deep crimson is spent constantly and on purpose — the
  masthead, every heading in an index, the drop cap, links. It is not a highlight applied
  to earned moments; it is the spine of the page.

If a screen looks weak, the fix is almost always more space and better type, not more colour.

> This is the sibling system to **Karakuli**, which is its exact inverse (wobbly, hand-drawn,
> colour rationed to celebrations). The two share nothing but a governance model, and neither
> is an amendment to the other. See `DECISIONS.md`.

---

## 1. Themes

Article ships **two themes, both first class**. Light is the reference editorial palette;
dark is a neutral, faintly warm grey. Neither is a derivation of the other, and neither is a
channel inversion — each was designed for its own ground.

### The two-layer token model

This is the load-bearing decision of the whole system, so it is stated first.

**Layer 1 — primitives** (`--art-c-*` light ramp, `--art-dk-*` dark ramp). Raw colour values.
**A component must never reference a primitive.** They exist only to be pointed at.

**Layer 2 — semantic roles** (`--art-surface`, `--art-ink`, `--art-accent`, …). The only
names a component may use. Each is declared exactly **once**, wrapped in `light-dark()`:

```css
--art-surface: light-dark(var(--art-c-paper-0), var(--art-dk-page));
```

Because both values live on one line, there is no second copy of the palette in a media
query that can drift out of step with the first. `tools/check-sync.mjs` enforces this: a
semantic token that carries a colour but is not wrapped in `light-dark()` fails the build.

Switching themes therefore means changing `color-scheme` and nothing else. Components never
learn that a theme exists. `web/theme.js` sets one attribute on `<html>`:

| `data-theme` | Result |
|---|---|
| *(absent)* | follow the operating system |
| `light` | force light |
| `dark` | force dark |

Inline `NO_FLASH_SNIPPET` from `web/theme.js` in `<head>` before the stylesheet, or the
first paint happens in the wrong theme.

### The accent role flip

The accent keeps its job across themes but **inverts its contrast direction**, and this is a
rule, not an implementation detail.

In light, `--art-accent` is a very dark crimson: it is a *fill* that carries white text.
In dark, the accent is a lighter, low-chroma red: it cannot be a fill under light text, so it
carries near-black text instead. Hence `--art-accent-ink` is `#FFFFFF` in light and
`--art-dk-near-black` in dark.

A corollary worth stating because it is the mistake this rule exists to prevent: **you
cannot port a light-theme fill to dark by darkening it.** Decide what the element's job is,
then pick the value that does that job in that theme.

### Theme-conditional values that are not colours

`light-dark()` carries colours only. A value that must differ per theme but is not a colour
has to be declared twice — once under `prefers-color-scheme`, once under
`[data-theme="dark"]` — which is exactly the duplication `light-dark()` exists to avoid. So
that block is kept **deliberately tiny, enumerated here, and verified by the checker**:
`check-sync`'s `[theme-pair]` rule fails the build if the two blocks stop agreeing.

There are exactly two such tokens today, and both come from one fact — **light text on a
dark ground optically thins**:

| Token | Light | Dark | Why |
|---|---|---|---|
| `--art-weight-display` | `700` | `800` | A high-contrast serif loses its hairlines against a dark ground |
| `--art-font-smooth` | `antialiased` | `auto` | Subpixel smoothing thins light-on-dark further, so dark opts *out* |

Add to this block only when there is genuinely no colour-based way to express the need.
Every addition is a place two values can drift.

### The masthead, which is where that rule was earned

The masthead resolves *structurally* differently per theme, and this is the canonical
worked example of the flip:

| | Light | Dark |
|---|---|---|
| `--art-bar` | `--art-c-crimson-700` — a solid crimson block | `--art-dk-raised` — a quiet surface |
| `--art-bar-mark` (wordmark) | `#FFFFFF` | `--art-dk-accent`, at full chroma |
| `--art-bar-edge` (bottom rule) | `transparent` — the block *is* the edge | `--art-dk-accent` — the brand persists as an edge |

The rejected alternative was keeping a crimson bar in dark, deepened to `#3B0D18`. Measured
against the page ground `#1E1E2E` that bar comes to **1.02:1** — the masthead would have no
visible boundary whatsoever, only a hue shift. Worse, the crimson would go from the
*brightest* element on the page in light (11.0:1 against paper) to the *darkest* element in
dark: the same hue in an inverted figure/ground role, which is not the identity surviving a
theme change. What survives is a colour at full chroma, so in dark the crimson moves to the
wordmark and to a 1px edge.

The wordmark's threshold there is **3:1, not 4.5:1** — it is set at `--art-text-2xl` (28px),
which is WCAG large text. A contrast pair's threshold is a property of the type size it is
used at, not of the pair.

---

## 2. Palette

### Light — sampled from the reference

| Token | Hex | Role |
|---|---|---|
| `--art-c-paper-0` | `#FCFBF9` | The page. Warm off-white |
| `--art-c-paper-50` | `#F5F3EE` | Raised surface |
| `--art-c-paper-100` | `#EBE8E1` | Sunken surface, code ground |
| `--art-c-rule` | `#E3DFD8` | Hairlines |
| `--art-c-ink-500` | `#585E6D` | Muted text — captions, eyebrows, metadata |
| `--art-c-ink-700` | `#181E2A` | Body text |
| `--art-c-ink-900` | `#000000` | Display headlines only |
| `--art-c-crimson-700` | `#7F0002` | **The structural accent.** Masthead, headings, drop cap, links |
| `--art-c-crimson-500` | `#AE002E` | The loud accent — small filled buttons that need chroma to read |
| `--art-c-crimson-900` | `#3B0D18` | Deepened crimson, dark-theme masthead |
| `--art-c-blue-600` | `#0E6FBB` | The contrasting action colour |

Three things about this palette are worth not "improving":

**The paper is warm, the ink is cool.** The reference ground is literally pure `#FFFFFF`;
Article warms it to `#FCFBF9` for long-form reading, and the surfaces and hairline warm with
it — a cool surface stepping off a warm ground reads as a colour mistake rather than as
elevation. The **ink** ramp stays cool (`#181E2A`, `#585E6D`) on purpose. Warm paper with
cool ink is the classic pairing, and the blue cast is also what lets these greys sit
comfortably beside the neutral grey of the other theme. Neutralising the ink, or
warming it to match the paper, breaks both relationships at once.

The reference spends **one** crimson structurally — masthead fill, every article heading,
and the drop cap are all the same `#7F0002`. The brighter `-500` exists only because a small
filled button needs more chroma than `#7F0002` has to read as an action rather than as a
dark rectangle. Do not introduce a third red.

### Dark — Darcula, with Catppuccin as a sanctioned alternate

Article ships **two dark palettes**. Both are held to the same contrast floor, and
`check-sync --contrast` measures every documented pair in each — an alternate palette nobody
has measured is just a broken theme waiting to be selected.

The default is **JetBrains Darcula**. The alternate is **Catppuccin Mocha**, selected with
`data-dark="catppuccin"` on `<html>`; it composes freely with `data-theme`.

| Token | Darcula *(default)* | Catppuccin | Role |
|---|---|---|---|
| `--art-dk-page` | `#2B2B2B` | `#1E1E2E` | The page |
| `--art-dk-raised` | `#35383A` | `#313244` | Raised surface; the masthead |
| `--art-dk-sunken` | `#232323` | `#181825` | Sunken surface, code ground |
| `--art-dk-rule` | `#4A4D4F` | `#45475A` | Hairlines |
| `--art-dk-rule-2` | `#5E6265` | `#585B70` | Emphasised rule |
| `--art-dk-ink` | `#ECECEA` | `#CDD6F4` | Display headlines |
| `--art-dk-ink-2` | `#D2D1CE` | `#BAC2DE` | Body text |
| `--art-dk-ink-3` | `#A8A6A3` | `#A6ADC8` | Muted text |
| `--art-dk-near-black` | `#1A1A1A` | `#11111B` | Text on an accent or action fill |
| `--art-dk-accent` | `#E16F77` | `#F38BA8` | The accent |
| `--art-dk-accent-2` | `#EC8189` | `#EBA0AC` | The loud accent |
| `--art-dk-alert` | `#FF5F52` | `#FF6E82` | Danger |
| `--art-dk-action` | `#6CB6FF` | `#89B4FA` | The action colour |
| `--art-dk-success` | `#8FD0A3` | `#A6E3A1` | Confirmation |
| `--art-dk-warning` | `#E8AC74` | `#FAB387` | Caution |

**A second palette costs one block of primitive overrides.** No semantic role is redeclared,
no component is touched, and light is unaffected by construction because light reads the
`--art-c-*` ramp. This is the clearest demonstration of why §1 splits the layers: adding a
whole theme is a layer-1 edit.

### Three adjustments, and the general rules behind them

**Darcula's `raised` is `#35383A`, not JetBrains' own panel grey `#3C3F41`.** That colour puts
muted text at 3.69:1, below AA. *Editor themes tune their editor background carefully and
their panel chrome much less so — when borrowing a palette, always check its secondary
surfaces.*

**The accent is `#E16F77`, not One Dark's `#E06C75`.** On this ground the original measures
4.431:1, just under the floor. The fix is a 0.6% lightness lift with hue and saturation held
exactly — 3/255 on two channels, visually the same colour, 4.55:1. *A palette borrowed from
elsewhere was tuned against its own background, not yours.*

**Danger differs from the accent in chroma, not merely in hue.** Darcula's accent is a dusty,
low-chroma red; its danger is a vivid scarlet at ΔE 50 from it. Catppuccin Mocha has only one
red, so its `alert` is the single value changed from the upstream flavour. *An accent that
collides with a status colour silently destroys the status signal — the error still shows,
it just stops meaning anything.*

**Why the dark accent is not a crimson at all.** A saturated crimson cannot reach 4.5:1 on a
dark ground — the light accent `#7F0002` manages 1.51:1 there, and a search across hue 344–8°
at full saturation shows anything clearing 4.5:1 is forced to hue 4–8°, which is scarlet
rather than crimson. Both dark accents are therefore lighter and low-chroma, and the low
chroma is the point: it behaves like an ink rather than an alert, which is what rhymes with a
colour whose character is depth rather than brightness. The two accents share a role, not a hue.

### Contrast

Every documented text-on-surface pair clears **WCAG AA (4.5:1)** in *both* themes.
`node tools/check-sync.mjs --contrast` prints the full table and fails the build on any
pair that drops below its minimum. The tightest pair in the system is white on
`--art-action` at **5.24:1**; treat that as the floor, and re-run the check after touching
any colour.

---

## 3. Typography

Article sets **English and Simplified Chinese**. Two faces, two jobs, plus a mono for the
code register — each declared as a *stack*, and the stack order is load-bearing:

```css
--art-font-body: 'Mulish', 'Noto Sans SC', system-ui, sans-serif;
                  ^ Latin      ^ CJK fallback
```

The Latin face comes **first**, so Latin renders in it. The browser falls through to the CJK
face only for codepoints the Latin face has no glyph for. This ordering is not cosmetic:
Noto Sans SC and Noto Serif SC both contain full Latin glyph sets, so putting either first
would silently take over the entire page.

Google serves the SC families in roughly 300 `unicode-range` slices, so a page containing no
Chinese downloads none of them — the CJK fallback is free until it is used.

For Traditional Chinese, swap `SC` → `TC` in the three font tokens. Nothing else changes.

- `--art-font-display` — every heading, the wordmark, the drop cap. **Vollkorn**, falling
  through to **Noto Serif SC**. Chosen by eye against three alternatives. Vollkorn was drawn
  for body text rather than for display, which is why it holds together at `--art-text-5xl`
  without the hairline strokes that a true didone loses against a dark ground — it is the
  pairing that survives dark mode best, not just the one that looks best in light.
- `--art-font-body` — everything a reader reads for information. **Inter**, falling through
  to **Noto Sans SC**. The most neutral option, which matters because this system is used for
  dense tool UI as much as for articles; a body face with personality competes with the serif.
- `--art-font-mono` — code, and only code. **JetBrains Mono**, falling through to
  **Noto Sans Mono**.

### Type scale

| Token | Size | Use |
|---|---|---|
| `--art-text-xs` | 13px | Fine print, table metadata |
| `--art-text-sm` | 15px | Captions, form hints, eyebrows |
| `--art-text-base` | 17px | Body |
| `--art-text-lg` | 19px | Lede paragraphs |
| `--art-text-xl` | 23px | Small headings, card titles |
| `--art-text-2xl` | 28px | Section headings |
| `--art-text-3xl` | 36px | Page titles |
| `--art-text-4xl` | 48px | Article titles |
| `--art-text-5xl` | 64px | Display / hero |

`--art-leading-body` is **1.6** and `--art-leading-heading` is **1.15** — a display serif
set tight is what makes a headline read as one object.

`--art-measure` is **68ch**, and it is the most load-bearing number in the system. Past
roughly 75 characters the eye loses the line return on the way back; below about 45 the
rhythm breaks. Long-form text is always constrained by it.

`--art-tracking-eyebrow` is **0.14em**, for uppercase small-caps section labels
(`EARLIER ON MASTERING EMACS` in the reference). Uppercase without added tracking looks
like a mistake at every size.

---

## 4. The ornament contract

Karakuli's pen contract is what makes twenty separate doodles look like one hand. Article
needs the same guarantee, and gets it by inverting every clause.

**Method:**

- **Geometric construction.** True circles, true rectangles, ruler-straight lines, exact
  angles. Drafted, not drawn. Where Karakuli forbids a perfect circle, Article requires one.
- **Mirror symmetry** about the vertical axis for every divider ornament: each element's
  twin sits at `width − x`, exactly.
- `fill="currentColor"` for filled shapes. Where stroked, `stroke-linecap="butt"` and
  `stroke-linejoin="miter"` — square and mitred, never round.
- **viewBox contract:** UI marks are `0 0 24 24`. Divider ornaments are `0 0 240 24`
  (`fleuron.svg`) or `0 0 120 24` (`dinkus.svg`).
- No wobble, no jitter, no randomness anywhere. Repetition is the point.

**The colour rule, which is absolute:** an ornament is never embedded as a
`data:image/svg+xml` URI with a colour baked into it. `currentColor` cannot reach inside a
data URI, so such a mark can never follow the theme or the accent. Ornaments live as files
in `ornaments/` and are applied as masks:

```css
.art-fleuron::before {
  content: ''; display: block; width: 220px; height: 24px;
  background-color: currentColor;
  mask: url('../ornaments/fleuron.svg') no-repeat center / contain;
  -webkit-mask: url('../ornaments/fleuron.svg') no-repeat center / contain;
}
```

`check-sync` fails the build on any colour found inside a `data:` URI. This is not a
stylistic preference — it is the single defect that has kept dark mode out of reach in the
sibling system, and it is cheap to prevent and expensive to retrofit.

### Inventory

| File | viewBox | Role |
|---|---|---|
| `fleuron.svg` | `0 0 240 24` | The section divider. The system's signature mark. |
| `dinkus.svg` | `0 0 120 24` | Quiet break inside an article, where a fleuron is too loud |
| `check.svg` | `0 0 24 24` | Checkbox mark |
| `minus.svg` | `0 0 24 24` | Indeterminate checkbox |
| `chevron-right.svg` | `0 0 24 24` | Disclosure, list affordance |
| `chevron-down.svg` | `0 0 24 24` | Select disclosure mark |
| `chevron-left.svg` | `0 0 24 24` | Back affordance on a mobile app bar |
| `arrow-right.svg` | `0 0 24 24` | Inline "continue reading" |
| `external-link.svg` | `0 0 24 24` | Link leaving the site |

---

## 5. Surfaces, rules, and the absence of shadow

- `--art-radius` is **`0`**. Everything is squared off.

  The rule is not "never write `border-radius`" — it is **never write a *literal* radius**.
  A component that needs to flatten a UA-rounded control (`<button>`, `<input>`) writes
  `border-radius: var(--art-radius)`, and that is the sanctioned use. It is also what makes
  the kit forkable: someone who wants soft corners changes one token and every component
  follows. A literal `4px`, a `50%`, or a per-component radius defeats both.
- **No `box-shadow`, anywhere.** Separation comes from a `--art-rule` hairline in light, and
  from the dark ramp's surface steps in dark.
- **No gradients.**
- Three surface roles only: `--art-surface` (the page), `--art-surface-raised`,
  `--art-surface-sunken`. A design that needs a fourth is describing a hierarchy problem.
- **Focus is always visible.** Every interactive element takes a 2px `--art-focus` outline
  with a 2px offset on `:focus-visible`. This is not negotiable per app.

---

## 6. Motion

Short, flat, and few. An editorial system does not bounce.

- `--art-motion-fast` **120ms** — state changes on a control (hover, check, focus).
- `--art-motion-base` **180ms** — anything that moves, opens, or fades.
- `--art-motion-ease` `cubic-bezier(0.2, 0, 0, 1)` — decelerating, no overshoot. There is no
  bounce curve in this system, deliberately.
- Fades and short rises only. Nothing draws itself, nothing sprouts, nothing loops.
- **`prefers-reduced-motion: reduce` is honoured** in `tokens.css` and must stay honoured.
  Article is meant to be used by other people, for their users.

---

## 7. Per-app knobs

Article is one system across several apps, and it stays coherent by keeping the number of
things an app may change small. There are exactly three:

1. **Accent hue.** An app may re-point `--art-accent` / `--art-accent-strong` /
   `--art-accent-ink` to a different hue, **in both themes**, provided the pair still clears
   the contrast floor in §2. One accent per app.
2. **Display serif.** An app may substitute a different display face, provided it ships
   Cyrillic and holds up at `--art-text-5xl`. The body sans does not change.
3. **Density.** The space scale may be stepped down one notch throughout for dense,
   tool-like surfaces (an admin table, a settings panel). Reading surfaces never are.

Everything else — the two-layer token model, the radius, the no-shadow rule, the ornament
contract, motion, the focus contract — is fixed. If a screen needs something outside these
three knobs, that is a signal to revisit this document, not to special-case the screen.

---

## 8. Do / Don't

| DO | DON'T |
|---|---|
| Reference semantic tokens (`--art-ink`, `--art-surface`) | Reference a primitive (`--art-c-*`, `--art-dk-*`) from a component |
| Declare each semantic colour once, via `light-dark()` | Redefine the palette inside a `prefers-color-scheme` block |
| Ship ornaments as files applied with `mask-image` | Inline an SVG as a `data:` URI with a colour baked in |
| Separate surfaces with a 1px hairline | Reach for a `box-shadow` to create depth |
| Write `border-radius: var(--art-radius)` when a control needs flattening | Write a literal radius — `4px`, `50%`, or a per-component value |
| Constrain long-form text to `--art-measure` | Let a paragraph run the full width of a wide screen |
| Spend one crimson structurally, everywhere it belongs | Add a second or third red for variety |
| Track uppercase labels with `--art-tracking-eyebrow` | Set uppercase at default tracking |
| Pick a dark value for the job it does | Derive a dark value by darkening the light one |
| Re-run `check-sync --contrast` after touching a colour | Trust that a palette tweak stayed accessible |

---

## 9. How this system evolves

- **Every change gets a `DECISIONS.md` entry** recording the decision, the reasoning, and
  what was rejected and why — so a later session never has to reverse-engineer the *why*,
  and never silently re-litigates a settled choice.
- **Half-decided stays in the backlog.** An unsettled idea goes to `DECISIONS.md`'s
  "Unsettled" section, never into this file as a hedge. This document states what is true now.
- **Subjective calls are staged, not argued.** Typography, a palette, anything that is a
  matter of taste: build a live comparison page, look at it, then decide. `demo/type.html` is
  the surviving example; the pages that settled the dark masthead and the dark palette were
  deleted once their decisions were recorded in `DECISIONS.md`, which is where the reasoning
  belongs — a comparison page is scaffolding, not a record.
- **The sync map and amendment recipe live in the `article-style` skill**, not here.
- **`tools/check-sync.mjs` is the gate.** Run it before every commit, and
  `--contrast` after touching any colour — it measures every documented pair in *every*
  palette, including the alternates, and prints the table.
- **The component gallery in `demo/index.html` is the visual gate.** It renders every
  component in every state; three shipped defects were found the first time it was built, none
  of which the checker could see. Keep it exhaustive.


---

## 10. Token reference

Every semantic token. These are the only names a component may use; the `--art-c-*` and
`--art-dk-*` primitives behind them are an implementation detail of `web/tokens.css`.

### Colour

| Token | Role |
|---|---|
| `--art-surface` | The page ground |
| `--art-surface-raised` | A surface sitting above the page |
| `--art-surface-sunken` | A recessed surface; code ground |
| `--art-surface-disabled` | The ground of an inert control. Recessed in light, raised in dark — "sunken" is nearly invisible on a dark ground, so the role flips direction like the accent does |
| `--art-ink-strong` | Display headlines only |
| `--art-ink` | Body text |
| `--art-ink-muted` | Captions, eyebrows, metadata, placeholders |
| `--art-rule` | Hairlines and borders |
| `--art-rule-strong` | An emphasised rule — a table header underline, a pull-quote edge |
| `--art-accent` | The structural crimson: masthead, headings, drop cap |
| `--art-accent-strong` | The loud accent, for small filled controls needing chroma |
| `--art-accent-ink` | Text on an accent fill. Flips between themes — see §1 |
| `--art-bar` | Masthead fill |
| `--art-bar-ink` | Masthead text — the nav links |
| `--art-bar-mark` | The wordmark, which carries the accent in dark |
| `--art-bar-edge` | The masthead's bottom rule. `transparent` in light; the accent in dark |
| `--art-bar-rule` | A hairline *inside* the bar — a nav separator. `--art-rule` is tuned against the page, not against the bar, so it cannot be used there |
| `--art-action` | The contrasting action colour, for a primary filled button |
| `--art-action-ink` | Label on an action fill |
| `--art-link` | Links in running text |
| `--art-focus` | The focus outline |
| `--art-danger` | Errors, destructive actions |
| `--art-success` | Confirmation |
| `--art-warning` | Caution |
| `--art-code-bg` | Code block and inline-code ground |
| `--art-code-ink` | Code text |
| `--art-selection-bg` | Text selection ground |
| `--art-selection-ink` | Selected text |

### Type

`--art-font-display`, `--art-font-body`, `--art-font-mono`;
`--art-text-xs` … `--art-text-5xl` (§3);
`--art-leading-body` (1.6), `--art-leading-lede` (1.38), `--art-leading-heading` (1.15),
`--art-tracking-eyebrow` (0.14em), `--art-measure` (68ch), `--art-measure-narrow` (44ch),
`--art-weight-display` (theme-conditional — see §1).

`--art-leading-lede` fills the gap between body and heading leading: anything set at
`--art-text-lg` or above but still running as a paragraph — a lede, a pull quote — reads
badly at 1.6 and worse at 1.15.

`--art-measure-narrow` is for centred text. A centred paragraph needs a shorter line than
left-aligned running text, because both of its edges move.

### Space and geometry

| Token | Value | Typical use |
|---|---|---|
| `--art-space-1` | 4px | Hairline gaps, icon nudges |
| `--art-space-2` | 8px | Label to field |
| `--art-space-3` | 12px | Inside a control |
| `--art-space-4` | 16px | Default gap between related elements |
| `--art-space-5` | 24px | Paragraph spacing, cell padding |
| `--art-space-6` | 32px | Between blocks |
| `--art-space-7` | 48px | Between subsections |
| `--art-space-8` | 64px | Between major sections |
| `--art-space-9` | 96px | Air around a page section; above and below a fleuron |

The scale stops doubling at `--art-space-5` on purpose: editorial layouts need a lot of
mid-range values, and the top of the scale exists for the air between major page sections,
which is where most of an editorial design's authority actually comes from.

`--art-radius` (`0`), `--art-rule-width` (`1px`), `--art-font-smooth` (theme-conditional —
see §1).

### Motion

`--art-motion-fast`, `--art-motion-base`, `--art-motion-ease` (§6).


---

## 11. Component reference

`web/article.css` holds the components; `web/prose.css` holds the long-form layer. State is
expressed with unprefixed hooks — `.is-active`, `:checked`, `:indeterminate`,
`[aria-invalid="true"]` — never with a `.art-`-prefixed state class.

### Headings must consume `--art-weight-display`

Any element set in the display serif at heading size — `.art-display`,
`.art-entry__title`, `.art-bar__mark`, `.art-dropcap`, and `h1`–`h4` inside `.art-prose` —
takes `font-weight: var(--art-weight-display)`, never a literal `700`. That token is the
system's dark-mode optical compensation (§1); a hardcoded weight silently opts the element
out of it, and nothing in the checker can see that it happened. It is the one rule here that
was written as canon before any component obeyed it, which is exactly why it is called out.

### Two rules that fall out of the palette

**Fills invert on hover; they do not darken.** §2 permits exactly one value per colour role
and forbids a second red, so there is no tint ramp to darken into. A filled button therefore
hovers by **swapping figure and ground** — `.art-btn--primary` on hover takes
`--art-action-ink` as its ground and `--art-action` as its label and border. This is louder
than a conventional 10%-darker hover, and that is correct for a system with this few
colours: the feedback has to come from somewhere, and inverting is the only move available
that adds no new value. Do not introduce `--art-*-hover` roles to avoid it.

**`transparent` is allowed as an edge placeholder.** A button's base border and an inactive
tab's edge are `transparent` so they reserve their space without being drawn, which stops
the layout shifting when the state changes. `tokens.css` already uses it this way for
`--art-bar-edge` in light. This is the one sanctioned use of a named colour.

### Editorial

| Class | Role |
|---|---|
| `.art-bar` | The masthead. `.art-bar__mark` (wordmark), `.art-bar__nav`, `.art-bar__link` |
| `.art-display` | A page title outside `.art-prose`. `.art-display--page` is the smaller step |
| `.art-lede` | Centred opening paragraph, `--art-measure-narrow`, `--art-leading-lede` |
| `.art-meta` | Byline and date under a title |
| `.art-dropcap` | Three-line drop cap in the accent. Metric-dependent — see below |
| `.art-eyebrow` | Uppercase letterspaced section label |
| `.art-rule` | A hairline |
| `.art-fleuron` | Section divider ornament |
| `.art-dinkus` | Quieter in-article break |
| `.art-entry` | Index row. `.art-entry--reverse` alternates the columns |
| `.art-entry__body` `.art-entry__media` | The text column and the image column |
| `.art-entry__title` `.art-entry__excerpt` `.art-entry__meta` | Title in the accent, excerpt, byline/date |
| `.art-figure` | Image block with `.art-figure__caption`. `.art-figure__media` carries the border on an `<img>` or an inline `<svg>` |

### Controls

| Class | Role |
|---|---|
| `.art-btn` | Base button |
| `.art-btn--primary` `.art-btn--secondary` | The filled pair — action colour and loud accent |
| `.art-btn--outline` `.art-btn--ghost` | Hairline and bare variants |
| `.art-field` | Form row wrapper, with `.art-label`, `.art-hint`, `.art-hint--error` |
| `.art-input`, `.art-textarea`, `.art-select` | Text and choice inputs |
| `.art-select-wrap` | Required wrapper carrying the select's disclosure mark |
| `.art-choice` | Inline control-and-label row — what a checkbox, radio or toggle sits in. `.art-field` stacks and is for text inputs |
| `.art-check`, `.art-radio` | Both **square**. They differ by their mark, never by their shape |
| `.art-toggle` | Squared track and thumb |
| `.art-tabs`, `.art-tab` | Active tab marked by a 2px accent bottom edge |

### Structure

| Class | Role |
|---|---|
| `.art-card` | Hairline box on a raised surface. No radius, no shadow |
| `.art-table` | Editorial table: no vertical rules, header underline, hairline rows. `.art-table__num` right-aligns tabular figures |
| `.art-list` `.art-list-row` | Hairline-separated rows |
| `.art-list-row__title` `.art-list-row__meta` `.art-list-row__chevron` | Row title, secondary text, trailing mark |
| `.art-badge` | Small status label |
| `.art-code`, `.art-pre` | Inline and block code |

### Mobile

| Class | Role |
|---|---|
| `.art-appbar` | Phone top bar |
| `.art-appbar__lead` `.art-appbar__title` `.art-appbar__trail` `.art-appbar__action` | Leading slot, centred title, trailing slot, an icon action |
| `.art-back` | Back affordance for the leading slot |
| `.art-tabbar` | Bottom navigation: `.art-tabbar__item`, `.art-tabbar__label` |

The active tab-bar item is marked by a 2px accent **top** edge and an accent label. The
marker is **static** — nothing travels between items. A travelling indicator is the sibling
system's signature and does not belong here.

### Long-form

`.art-prose` styles bare HTML — `h1`–`h4`, `p`, `ul`, `ol`, `li`, `a`, `strong`, `em`,
`blockquote`, `hr`, `code`, `pre`, `img`, `figure`, `table`, `small` — so rendered Markdown
needs no class attributes at all. `hr` renders as the dinkus ornament rather than as a line.
It is a separate file so that app UIs can load `article.css` without it.

### The drop cap is metric-dependent

`.art-dropcap`'s `font-size` and `line-height` are *derived*, not chosen. For a cap spanning
three lines, its cap height must equal the distance from line 1's cap top to line 3's
baseline:

```
  distance   = fontSize × (capHeight_body + 2 × leading)
             = 17px × (0.727 + 2 × 1.6)  = 66.8px
  dropcap fs = distance ÷ capHeight_display
             = 66.8 ÷ 0.70  = 95.4px  = 5.6em
```

Vollkorn's cap height is 0.70em and Inter's is 0.727em, which is what puts the current value
at `5.6em`. **Changing `--art-font-display` or `--art-font-body` invalidates this** — re-run
the arithmetic with the new faces' cap heights, or the cap will no longer sit on the third
baseline.
