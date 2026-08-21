# Making it yours

Article is a starting point. It's built to be re-skinned — by you, or by you and an LLM
working from a screenshot of something you like. That's how Article itself was made.

You don't need to read `STYLE.md` to do this. Everything you need is here.

## Six values

These decide how the system feels. Everything else can stay as it is. They're all near the
top of `web/tokens.css`.

| Token | What it is |
|---|---|
| `--art-c-paper-0` | page background, light |
| `--art-c-ink-700` | body text, light |
| `--art-c-crimson-700` | **accent**, light |
| `--art-dk-page` | page background, dark |
| `--art-dk-accent` | **accent**, dark |
| `--art-font-display` / `--art-font-body` | the two fonts |

Change them, then run:

```sh
node tools/check-sync.mjs --contrast
```

Green means you're done. That's the only test you need to pass.

## Getting colours out of a picture

Don't guess hex codes from a screenshot. Read them:

```sh
node tools/palette-from-image.mjs ref.png --roles
```

You get the main colours, a suggested mapping onto Article's roles, and the contrast of each
one already measured — so a colour that won't work gets rejected before you use it.

Use `--box` to sample one part of the image. This matters: the colour you want is usually a
button or a header bar, not the most common pixel on the page.

```sh
node tools/palette-from-image.mjs ref.png --box 1240,500,1480,540
```

Sample the header, a button, a heading and the background separately. Four commands, whole
palette.

## Then

1. Put the values in the `--art-c-*` (light) and `--art-dk-*` (dark) blocks in
   `web/tokens.css`. Don't touch anything below them.
2. Run the checker. Fix what it flags.
3. Changed a font? Redo the drop cap maths — three lines, in `STYLE.md` §3.
4. Open the preview — `demo/index.html`, or
   [the hosted one](https://gr13nka.github.io/article/demo/) — and look at it in both
   themes.

## Don't break these

- **Components never use a raw colour.** They use roles like `--art-accent`. Need a new
  colour? Add a role for it.
- **Define each colour once**, with `light-dark()`. Two copies always drift apart.
- **No colours inside `data:` URIs.** The icon can never change with the theme. Use a file in
  `ornaments/` with `mask-image`.
- **No hardcoded `border-radius`.** Use `var(--art-radius)`. Want rounded corners? Change
  that one value and everything follows.
- **No shadows, no gradients.**
- **One accent colour.** A second one halves the meaning of the first.

## Four things that will bite you

We hit all four. They cost real time.

**A borrowed colour will miss AA by a hair.** It was picked for someone else's background,
not yours. Fix it by nudging *lightness* only, keeping hue and saturation the same — it stays
the same colour to the eye. Article's dark accent is One Dark's `#E06C75` nudged to
`#E16F77`. Three units out of 255, and it's the difference between failing and passing.
`palette-from-image.mjs` works this out for you.

**Check the secondary surfaces too, not just the background.** Editor themes get their main
background right and their panel colours wrong. JetBrains Darcula's own panel grey `#3C3F41`
fails AA, so Article uses `#35383A` instead.

**Keep your error colour away from your accent.** If both are red, an error stops looking
like an error. It still shows — it just doesn't mean anything any more.

**A deep saturated red won't work on a dark background.** Article's light accent gets 1.51:1
there. Dark accents have to be lighter and less saturated. So your light and dark accent are
the same *role*, not the same colour. Don't fight this.

## Adding a whole dark theme

Copy the `[data-dark="catppuccin"]` block in `web/tokens.css`, rename it, change the values.
Nothing else changes — no component, no role. Then:

```html
<html data-dark="yourtheme">
```

The checker finds your block on its own and holds it to the same standard.

## More

`THEMING.md` goes deeper. `STYLE.md` explains why the rules exist. `DECISIONS.md` records
what was already tried and rejected — worth a look before changing something structural.
