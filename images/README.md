# Drop your own pictures here

The app ships with three hand-drawn scenes built into the code, so it looks
finished the moment you clone it. Nothing here is required.

When you want to swap in your own artwork, drop files in with these names:

| File | What it is |
| --- | --- |
| `memory1.jpg` | Colour picture for **The Rainy Window** (the puzzle image) |
| `memory2.jpg` | Colour picture for **Movie Night** |
| `memory3.jpg` | Colour picture for **The Picnic** |
| `memory1-lines.svg` | Optional line art for the same memory's colouring page |
| `memory2-lines.svg` | " |
| `memory3-lines.svg` | " |

The app checks for each file at load time and uses it if it is there. If it is
not, it falls back to the built-in drawing without complaining. (You will see a
few harmless 404s in the browser console until you add them — that is the check
happening, not a bug.)

## Photos

Use **square** images. Anything else gets centre-cropped, and the puzzle slices
the picture into a 3×3 grid, so square is what you want. Around 800×800 to
1200×1200 is plenty.

A cartoon-style or illustrated version of a real photo works far better than the
photo itself — the puzzle tiles read more clearly, and it matches the rest of the
app.

## Line art

Only needed if you want the colouring page to differ from the built-in scene.
It must be an SVG whose fillable shapes carry a `data-fill` attribute:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <path data-fill="sky" data-label="the sky" d="..." />
  <circle data-fill="moon" data-label="the moon" cx="450" cy="120" r="34" />
</svg>
```

* `data-fill` — a unique id per region. Tapping the region fills it.
  Shapes sharing an id fill together (handy for the petals of one flower).
* `data-label` — optional; shown in the little caption when she taps it
  ("the sky — coloured in ✨").

Draw back to front, the way you would paint it. Anything without `data-fill`
stays as plain line work she can colour over with the brush.

If a file is missing `data-fill` attributes entirely, the app ignores it and
uses the built-in scene, rather than handing her a page that will not respond
to taps.
