# Article — formal editorial design system (entry point for Claude)

This repo is **Article**: a formal, editorial design language for software that is mostly
words — reading tools, dev tools, docs, dashboards. It is not an app; it's the *kit*.
Article in one line: **a well-set page — display serif over humanist sans, one structural
crimson, hairlines and ornaments, squared off, no shadows, light and dark both first class.**

It is modelled on `masteringemacs.org`; the light palette was eyedropped from that site, and
the dark theme is a neutral, faintly warm grey with a low-chroma red.

**Article is the sibling of Karakuli** (`~/Documents/karakuli`), the user's naive/cosy
hand-drawn system. They are inverses and share no code — Karakuli forbids straight lines and
rations colour; Article is nothing but straight lines and spends colour structurally. Never
port a rule from one into the other, and never treat one as an amendment to the other.

Unlike Karakuli, **Article is built to be shared**: MIT-licensed, no machine-specific paths,
a README aimed at strangers. Keep it that way.

## Authority order — read before changing anything

1. **`STYLE.md`** — the constitution. Palette (both themes), the two-layer token model, the
   accent role flip, typography, the ornament contract, surfaces, motion, the three per-app
   knobs, Do/Don't, and the full token reference. If `STYLE.md` and any other file disagree,
   `STYLE.md` wins and the disagreement is a bug — `tools/check-sync.mjs` exists to catch it.
2. **`DECISIONS.md`** — append-only log of every decision with its *why* and what was
   rejected, plus the **Unsettled** backlog. Read it before proposing a change: never
   re-litigate a decision recorded there, and never implement an Unsettled item without the
   user's explicit go-ahead. Existing entries are never edited or deleted.
3. **`THEMING.md`** — the outward-facing guide for people re-colouring the kit. If you change
   how theming works, this is the file that has to stay true.

## Repo map

| Path | What it is | Notes |
|---|---|---|
| `STYLE.md` | Canon | English |
| `DECISIONS.md` | Decision log + Unsettled backlog | Append-only |
| `THEMING.md` | "Make it yours" guide | Written for strangers, not for the author |
| `web/tokens.css` | All `--art-*` tokens | Two layers: primitives, then semantic roles |
| `web/article.css` | Component classes (`.art-btn`, `.art-bar`, `.art-table`, …) | Reference implementation |
| `web/prose.css` | Long-form layer — styles bare HTML under `.art-prose` | Separate so app UIs need not load it |
| `web/theme.js` | Theme control + the no-flash snippet | light / dark / follow-the-system |
| `ornaments/` | The marks | Geometric, mirror-symmetric, applied as masks |
| `demo/index.html` | Showcase: editorial website + 3 phone screens, both themes | Serve over http, never file:// |
| `demo/type.html` | Typography sampler | Compare candidate faces side by side |
| `FORK.md` | The re-skin recipe for a user + LLM working from reference images | The file to hand someone forking the kit — self-contained, no need to read canon |
| `tools/check-sync.mjs` | Drift checker + contrast gate | Run before every commit; exit 1 on drift |
| `tools/contrast.mjs` | Shared WCAG maths + `liftToContrast` | One implementation, so a suggested colour and a checked colour cannot disagree |
| `tools/palette-from-image.mjs` | Read a palette out of a reference PNG | Zero-dep PNG decode; `--box` to sample a region, `--roles` to map onto tokens |
| `tools/shoot.mjs` | Regenerate the README screenshots | Run after any visible design change, or the pictures go stale |
| `docs/screenshots/` | Committed PNGs the README renders | Generated — never hand-edit |

## How to work here

- **Serving demos:** `python3 -m http.server 8770` from the repo root, then open
  `http://127.0.0.1:8770/demo/…`. `file://` breaks ES modules — never use it. Show visual
  results to the user in Orca's embedded browser (`orca tab create --url …`).
- **Choosing by eye:** subjective calls (typeface, the dark masthead) are settled by building
  a live comparison page and letting the user pick. This has already worked twice here.
  Don't pick aesthetics for the user; stage the choice.
- **Building demos and mockups:** delegate the page authoring to a subagent with a precise
  brief. Keep the tokens, the contracts and the canon docs in the main thread — those are the
  design; the markup is not.
- **Changing canon:** conflict-check against `DECISIONS.md`, edit `STYLE.md`, walk the sync
  map in the `article-style` skill, append a `DECISIONS.md` entry (decision + why + rejected
  alternatives), run `node tools/check-sync.mjs`, commit. Half-decided ideas go to the
  Unsettled backlog, not into `STYLE.md` as hedges.
- **Commits:** short imperative messages, no AI/Claude co-authorship or attribution
  trailers — ever (user's standing rule).
- **After any visible design change**, run `node tools/shoot.mjs` so the README screenshots
  still match the code. They are committed, so they are the one artefact that can go stale
  without the checker noticing.
- **Re-skinning from a reference image** is the kit's intended fork workflow: sample with
  `node tools/palette-from-image.mjs ref.png --roles`, follow `FORK.md`, stop when
  `node tools/check-sync.mjs --contrast` is green.

## The rules most likely to be broken by accident

- **Never reference a primitive (`--art-c-*`, `--art-dk-*`) from a component.** Components
  see semantic roles only. If a colour has no role, add the role.
- **Never bake a colour into a `data:` URI.** `currentColor` can't reach inside one, so the
  mark can never follow the theme. Use `ornaments/*.svg` with `mask-image` +
  `background-color: currentColor`. The checker fails the build on this.
- **Never redefine the palette in a `prefers-color-scheme` block.** Semantic colours are
  declared once, via `light-dark()`. Two copies drift; one cannot.
- **Don't derive a dark value by darkening the light one.** Decide the element's job, then
  pick the value that does that job in that theme (`STYLE.md` §1).
- **`--art-radius` is `0` and there are no shadows.** A radio button in Article is a square.
- Any new token or class must be named in `STYLE.md`, or `check-sync` fails the build. It
  must **also** be named in the `article-style` skill — that is a separate `[skill]` rule,
  because the general class check passes if any single doc mentions the class, which let the
  skill rot silently while the build stayed green.
- **Screenshots are generated.** After any visible design change run `node tools/shoot.mjs`.
  They are committed (GitHub needs them in-repo to render the README), so they are the one
  artefact that goes stale without `check-sync` noticing.
- A semantic role names a **job**, and its direction may invert between themes — the accent
  (fill in light, ink in dark) and `--art-surface-disabled` (sunken in light, raised in dark)
  are both instances. Never derive a dark value by adjusting the light one's lightness.
- Re-run `node tools/check-sync.mjs --contrast` after touching any colour. Both themes.
