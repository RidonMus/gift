# Drop your own pictures here

Every memory needs two pictures: a colour photo for the puzzle, and a
black-and-white line-art version for the colouring page. Both are required — if
one is missing, the app says so in the spot the picture should have been and
names the file it was looking for.

Drop files in with these names:

| File | What it is |
| --- | --- |
| `original1.jpg` | Colour photo — the puzzle picture |
| `original2.jpg` | " |
| `original3.jpg` | " |
| `memory1-lines.jpg` | Line art for the same memory's colouring page (`.png` or a `data-fill` `.svg` also work) |
| `memory2-lines.jpg` | " |
| `memory3-lines.jpg` | " |

Which file belongs to which memory is set in
[`src/data/memories.js`](../../src/data/memories.js) — change the names there if
you prefer different ones.

The app checks for each file at load time. A missing or unreadable file shows a
dashed placeholder naming the path it tried, so a typo is obvious without
opening the console.

## Photos

Use **square** images. Anything else gets centre-cropped, and the puzzle slices
the picture into a 4×4 grid, so square is what you want. Around 1200×1200 to
1400×1400 is plenty — the board never displays much above 550px, so anything
larger is bytes she waits on for nothing.

A cartoon-style or illustrated version of a real photo works far better than the
photo itself — the puzzle tiles read more clearly, and it matches the rest of the
app.

## Line art

Only needed if you want the colouring page to differ from the built-in scene.
Two formats work:

### A photo run through an outline filter (JPG/PNG)

The simplest option if you've turned a real photo into a black-and-white
outline drawing (an AI outline filter, a Procreate trace, etc.) — just name it
`memory1-lines.jpg` and drop it in. Use a **square** image, same as the photo,
since the app stretches it to a square canvas both for display and for finding
the regions.

There's no manual work here: the app scans the picture itself, finds every
enclosed patch of white bounded by dark lines, and turns each one into a
tappable region — a sleeve, a button, a strand of hair, all separately
fillable, the same way they would be in a printed colouring book. Nothing to
label or trace by hand.

### Hand-authored SVG

For art you're drawing yourself (or the built-in scenes, which work this way).
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
