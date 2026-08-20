# Decisions

Append-only. Every entry records what was decided, why, and what was rejected — so that a
later session never has to reverse-engineer the reasoning, and never silently re-litigates a
choice that was made deliberately. **Existing entries are never edited or deleted.** If a
decision is reversed, that reversal is a new entry that says so.

Half-decided ideas belong in **Unsettled**, not in `STYLE.md` as a hedge.

## Unsettled

- **Compose / Android mapping.** A `Article.kt` parallel to Karakuli's `compose/Karakuli.kt`,
  with light *and* dark colour schemes from the start (Karakuli's is light-only by design).
  Deferred until the web design has settled — committing Kotlin token values before then
  would just be a second thing to keep in sync.
- **Density knob.** `STYLE.md` §7 grants apps a one-notch step down of the space scale for
  dense tool surfaces. The mechanism is not built; it is currently a written permission, not
  a token or a class.
- **Print / poster arm.** Karakuli has one (`poster/`). Whether an editorial system needs a
  separate louder register, or whether its print voice is simply itself at a larger size, is
  not decided.
- ~~**Publishing.**~~ Settled 2026-08-20: published publicly at
  `github.com/gr13nka/article`. See the entry below.
- **Syntax highlighting for the code register.** `--art-code-bg` / `--art-code-ink` cover a
  code block as a block. A token-level highlighting palette — which would want most of the
  Catppuccin accent ramp, and a light-theme equivalent that does not currently exist — is
  not designed.

## Log

### 2026-08-20

#### Article is a sibling design system, not a register inside Karakuli

Article lives in its own repository, with its own constitution, its own `--art-` prefix, its
own decision log and its own authoring skill. Karakuli is untouched.

What drove it: the reference design inverts Karakuli's canon clause by clause rather than
extending it. Karakuli's `STYLE.md` §3 forbids straight lines and perfect rectangles;
Article is nothing but rectangles. §5 rations colour to earned moments; Article spends one
crimson structurally on every page. §4 defines six hand-drawn intrusions; Article has none.
`poster/POSTER.md` works as a satellite inside Karakuli precisely because it only changes
*volume* — it opens by stating that everything in `STYLE.md` "still applies without
exception." A system that inverts canon cannot extend it.

The second driver is that Article is meant to be shared. Karakuli is private, personal,
carries no licence, and hardcodes `/Users/…` paths in two files; publishing a combined repo
would mean publishing a personal decision log and two mascots along with it.

Rejected: a monorepo of kits under the Karakuli repo — it pays the entire migration cost
(the skill and the checker hardcode each other's absolute paths) before a line of the new
style exists, and makes `CLAUDE.md`'s single authority order ambiguous. Also rejected: a git
fork, which implies shared history and future merges, when in fact nothing merges — the pen
contract, the doodles, the mascots, boil and the sound layer are all dead weight here.

Note for future sessions: **this does not resolve Karakuli's "Karakuli Prose" backlog item.**
Prose is a serif *reading register* that keeps canon paper, ink and accent and stays
hand-drawn. It remains unsettled in Karakuli's own log.

#### Colour tokens come in two layers, and every semantic colour is declared exactly once

Layer 1 is primitives (`--art-c-*`, `--art-ctp-*`): raw values no component may reference.
Layer 2 is semantic roles (`--art-surface`, `--art-ink`, `--art-accent`, …), each declared
once and wrapped in `light-dark()`. Theming is then entirely a `color-scheme` change;
`web/theme.js` sets one attribute on `<html>` and nothing else in the system knows a theme
exists.

What drove it: Karakuli's dark mode has been "not designed" since the system was written,
and the reason is diagnosable rather than a matter of effort — `--krk-paper: #F7F3E9` is
simultaneously a raw value and a semantic role, so nothing can be re-pointed per theme
without redefining the whole palette. Splitting the layers is what makes two themes cost
almost nothing.

`light-dark()` specifically, rather than a `prefers-color-scheme` block plus a `[data-theme]`
block: those two approaches require the dark palette to be written *twice*, in two places
that can drift. With `light-dark()` both values sit on one line and cannot be edited
independently. `tools/check-sync.mjs` enforces it — a semantic token carrying a colour
without `light-dark()` fails the build.

Rejected: duplicating the dark block and adding a checker rule to compare the two copies for
equality. That detects drift instead of preventing it, which is strictly worse.

#### Ornaments are files applied as masks; no colour is ever baked into a data: URI

Every mark in the system — the fleuron, the check, the chevrons — lives as an SVG in
`ornaments/` and is rendered with `mask-image` plus `background-color: currentColor`.

What drove it: `karakuli.css` renders six marks as inline `data:image/svg+xml` URIs with the
ink hex `%2326241F` baked in, because `currentColor` cannot reach inside a data URI. Those
six marks physically cannot follow a theme or an accent, and they are the single largest
obstacle to retrofitting dark mode there. The defect is nearly free to prevent and expensive
to undo, so `check-sync` fails the build on any colour found inside a `data:` URI.

Rejected: inlining ornaments directly into the HTML so `currentColor` works. That does solve
the colour problem, but it duplicates the path data at every use site and puts artwork in
markup, where the checker cannot inventory it.

#### The dark masthead is a mantle surface with an accent edge, not a deepened crimson bar

In light the masthead is a solid `#7F0002` block with white text and no bottom rule — the
block is its own edge. In dark it becomes `--art-ctp-mantle` with the crimson moving to the
wordmark and to a 1px bottom rule. Four tokens carry this: `--art-bar`, `--art-bar-ink`,
`--art-bar-mark`, `--art-bar-edge`.

Decided by eye against `demo/theme.html`, which rendered both candidates as realistic page
slices side by side.

What drove it: the rejected alternative — holding the crimson and deepening it to `#3B0D18` —
measures **1.02:1** against the page ground `#1E1E2E`. The masthead would have had no
visible boundary at all, only a hue shift. And it would not have preserved the identity it
was meant to protect: the crimson goes from the brightest element on the page in light
(11.0:1 against paper) to the darkest element in dark, the same hue in an inverted
figure/ground role. What survives a theme change is a colour at full chroma, and `#F38BA8`
on mantle reads at 7.58:1.

Also rejected: a plain mantle bar with a neutral `--art-rule` hairline (what Catppuccin
itself would do). Correct but anonymous — it gives the masthead no signature. Putting the
accent in the edge keeps the brand and matches the system's own doctrine, in which hairlines
carry structure and fills do not.

#### The paper is warm, the ink stays cool

The light ground is `#FCFBF9` rather than the reference's literal `#FFFFFF`, and the raised
surface, sunken surface and hairline warm with it. The ink ramp (`#181E2A`, `#585E6D`) stays
cool.

What drove it: warmth is easier on the eyes for long-form reading, which is what this system
is mostly for. The surfaces had to follow, because a cool surface stepping off a warm ground
reads as a colour mistake rather than as elevation. The ink deliberately did not follow —
warm paper with cool ink is the classic pairing, and the blue cast is also what lets these
greys sit next to Catppuccin's blue-black base in the other theme. Warming the ink to match
the paper would break both relationships at once.

Cost, accepted: about 2% of contrast across the board versus pure white. Every documented
pair still clears AA with margin; the tightest in the system is white on `--art-action` at
5.24:1.

#### Article sets English and Simplified Chinese, and the Latin face always comes first

The three font tokens are stacks: a Latin face, then a Noto CJK face, then system fallbacks.
`--art-font-body: 'Mulish', 'Noto Sans SC', system-ui, sans-serif`.

What drove it: the sibling system is used in English and Russian, and the first draft of this
one inherited that assumption — the typography sampler was built to compare Latin against
Cyrillic. The actual requirement is English and Chinese, so the sampler's Cyrillic column was
answering a question nobody asked.

**Stack order is load-bearing and is the trap here.** Noto Sans SC and Noto Serif SC both
ship complete Latin glyph sets. Listing either before the Latin face does not produce a
fallback — it silently renders the entire page, English included, in the CJK family, and it
looks *almost* right, which is what makes it expensive to notice. The Latin face goes first;
the browser falls through to CJK only for codepoints the Latin face cannot draw.

Cost, checked before adopting: none for readers who never see Chinese. Google serves the SC
families in roughly 300 `unicode-range` slices, so a page with no CJK codepoints downloads
none of those files.

Rejected: a single family covering both scripts. Nothing available covers a high-contrast
editorial Latin serif and Chinese at the quality either deserves; the stack is not a
compromise, it is the correct mechanism. Also rejected: Traditional Chinese as the default —
it is a one-line swap (`SC` → `TC`) documented in `STYLE.md` §3, so defaulting to Simplified
costs a TC user one edit rather than forcing a choice on everyone.

#### The type pairing is chosen from the demo, not from a specimen page

`demo/type.html` was built to settle the font pairing by eye across four candidates. It did
its job as a *specimen* — it proved all four render, and it solved the drop-cap alignment
from live font metrics — but the choice was deferred to `demo/index.html` instead, at the
author's request: a typeface is judged better in a real page, next to real components, than
in a comparison strip.

`demo/type.html` stays in the repo as a working tool rather than as a decision record. Anyone
re-typing the kit can point it at their own candidates.

#### Dark ships two palettes: Darcula by default, Catppuccin as an alternate

Dark is **JetBrains Darcula** (page `#2B2B2B`, accent `#E16F77`), with **Catppuccin Mocha**
available as `data-dark="catppuccin"`. Light is unchanged.

How this was reached, because the path matters more than the destination: the system first
shipped Catppuccin Mocha, which was rejected on sight — its base `#1E1E2E` is visibly
blue-purple rather than neutral, and its red `#F38BA8` is a pastel pink, neither of which
rhymes with a light theme built on a deep crimson. A replacement was designed from a macOS
neutral grey and chosen by eye from `demo/dark.html`. Darcula was then requested as an
addition, and finally chosen over that replacement, with Catppuccin restored alongside it.
Four other grounds and four other accents were built, measured, and removed.

**Two palettes cost one block of primitive overrides.** No semantic role is redeclared and no
component is touched; light is unaffected by construction because it reads the `--art-c-*`
ramp. Both palettes are measured by `check-sync --contrast`, which now runs a pass per
palette — an alternate palette nobody has measured is just a broken theme waiting to be
selected.

Three values are not what they claim to be, each for a reason worth keeping:

- `raised` is `#35383A`, **not** JetBrains' own panel grey `#3C3F41`, which puts muted text at
  3.69:1. Editor themes tune their editor background carefully and their panel chrome much
  less so — always check a borrowed palette's secondary surfaces.
- The accent is `#E16F77`, **not** One Dark's `#E06C75`. The original measures **4.431:1** on
  this ground — under the 4.5 floor, because it was tuned against One Dark's own darker
  background. The fix is a 0.6% lightness lift with hue and saturation held exactly: 3/255 on
  two channels, visually identical, 4.55:1. Shipping the original was considered and rejected:
  the shortfall is invisible to the eye but real to a user who needs the contrast, and it
  would have meant a permanently red build.
- Danger differs from the accent in **chroma**, not merely hue — Darcula's is a vivid scarlet
  at ΔE 50 from its dusty accent, and Catppuccin's `alert` is the one value changed from the
  upstream flavour, because Mocha has only one red. An accent that collides with a status
  colour silently destroys the status signal: the error still shows, it just stops meaning
  anything.

The underlying finding, which constrains any future dark accent: **a saturated crimson cannot
reach 4.5:1 on a dark ground.** `#7F0002` manages 1.51:1 there, and a search across hue 344–8°
at full saturation shows anything clearing 4.5:1 is forced to hue 4–8° — scarlet, not crimson.
Both dark accents are therefore lighter and low-chroma. The light and dark accents share a
role, not a hue.

#### The wordmark is large text, and holding it to 4.5:1 was wrong

`check-sync`'s contrast pair for `--art-bar-mark` on `--art-bar` is **3:1**, not 4.5:1.

What drove it: `.art-bar__mark` is set at `--art-text-2xl` (28px), which is WCAG "large text",
where the threshold is 3:1. The checker held it to 4.5:1, and that over-strict figure was
used as the tiebreaker to disqualify two accent candidates that were in fact perfectly valid.
The error mattered because it did not surface as a false failure — it surfaced as a
*recommendation*, which is far harder to notice.

The general rule this is an instance of: a contrast pair's threshold is a property of the
**type size the pair is used at**, not of the pair itself. Any pair added to `PAIRS` needs its
minimum chosen from where it actually appears on screen.

#### A surface role may flip direction between themes, the same way the accent does

`--art-surface-disabled` is `--art-c-paper-100` in light and `--art-dk-raised` in dark: on
paper an inert control reads as pressed *into* the page, but on a dark ground "sunken" is
nearly invisible — the previous value measured **1.07:1** against the page in the Catppuccin
palette, so the disabled state was carried almost entirely by text opacity.

What drove it: building the full component gallery rendered every control in every state in
all three palettes at once, which is the only way this was ever going to be noticed. A
disabled field looks fine in isolation; it looks wrong beside an enabled one.

The general rule, which now has two instances (this and the accent in §1 of `STYLE.md`): a
semantic role names a **job**, and the direction that does that job is allowed to invert
between themes. Deciding a dark value by adjusting the light one's lightness is the mistake;
deciding it from the job is the method.

#### The gallery is the component layer's regression surface, and it earned that on day one

`demo/index.html`'s gallery renders every component in every state — rest, hover,
focus-visible, disabled, invalid, checked, indeterminate — grouped and labelled.

Building it immediately surfaced three defects that had already shipped:

- `.art-table tbody th` had no `border-bottom`, so the row separator hairline stopped dead at
  the row-header column. The rule that gave row headers their padding and weight forgot the
  border.
- `.art-table__num` was inert on a `<thead>` cell: `.art-table thead th { text-align: left }`
  is specificity (0,1,2) against a bare `.art-table__num`'s (0,1,0), so a numeric *column
  heading* sat left-aligned above its right-aligned figures. Fixed by scoping the selector.
- The disabled-field ground above.

None of these were findable by the checker, and none were visible in the showcase's ordinary
prose. They were visible the moment the states were placed side by side. That is the argument
for keeping the gallery exhaustive even though it is tedious: it is cheaper than the bugs.

#### The authoring skill is checked separately from the other docs

`check-sync` gained a `[skill]` rule: when the `article-style` skill is installed, it must
itself name every `.art-*` class, every ornament and every font family.

What drove it: the existing class-coverage rule passes if a class is named in **any** doc.
`STYLE.md` named them all, so the skill silently rotted — it was missing six classes and an
ornament, and its type section still named the fonts that had been replaced hours earlier,
while the checker reported OK throughout.

The skill is the file an agent actually works from, so "covered by some other document" is
not good enough for it. The rule is skipped entirely when no skill is installed, because a
fresh clone has none and that is not drift.

#### Screenshots are generated, never hand-made

`tools/shoot.mjs` produces every image in `docs/screenshots/` by driving the cached Chromium
over CDP. It hides the demo's own control strip and class-name annotations, and can compose a
shot out of non-adjacent parts of the page (`hide`, and `from`/`to` selectors).

What drove it: the screenshots are committed, because GitHub needs them in-repo to render the
README — which makes them the one artefact here that can go stale without `check-sync`
noticing. A hand-cropped PNG would silently stop matching the code at the first design change.
Generated, they are re-made with one command.

The README shot deliberately composes the masthead onto the *article* page rather than
showing the hero section, which is faithful to the reference but almost empty and reads as a
blank page at README size.

#### Published publicly at github.com/gr13nka/article, MIT

The repo was built public-shaped from the first commit — MIT licence, a README written for
strangers, no machine-specific paths in the tooling, and a `homedir()`-derived skill path with
an env override so the checker works on a clone that has no skill installed.

Sharing was the original reason this system is a sibling repo rather than a register inside
Karakuli, so publishing is the point rather than an afterthought. `FORK.md` exists because the
intended use is that someone re-skins it from their own reference images.

#### `prefers-reduced-motion` is honoured — a deliberate divergence from Karakuli

`web/tokens.css` carries a reduced-motion guard, and it stays.

What drove it: Karakuli's log records the guard being stripped from every surface at the
author's explicit request, with the accessibility cost knowingly accepted. That was a
decision about the author's own apps. Article is meant to be used by other people, for their
users, and its motion budget is a couple of 120–180ms fades — the guard costs essentially
nothing here and its absence would be a defect shipped to strangers.
