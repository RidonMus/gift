/* ---------------------------------------------------------------------------
 * scenes.js — the hand-drawn artwork, defined once and rendered two ways.
 *
 * Every scene is a function of `f`, a lookup that turns a region id into a
 * fill value. That single trick gives us both halves of the app for free:
 *
 *   mode 'color' -> f returns the scene's pastel palette  (the puzzle picture)
 *   mode 'lines' -> f returns 'transparent'               (the colouring page)
 *
 * Regions carry `data-fill` so the colouring canvas can hit-test them, and
 * `data-label` so we can name what she just tapped. Note the deliberate use of
 * `transparent` rather than `none`: `fill="none"` makes a shape invisible to
 * pointer events, which would leave half the picture un-colourable.
 * ------------------------------------------------------------------------- */

const INK = '#3C3A38'

/** A plump little heart, centred on (cx, cy) with size `s`. */
function heart(cx, cy, s) {
  return [
    'M ' + cx + ' ' + (cy + s * 0.62),
    'C ' + (cx - s * 1.15) + ' ' + (cy - s * 0.22) + ', ' + (cx - s * 0.58) + ' ' + (cy - s) + ', ' + cx + ' ' + (cy - s * 0.36),
    'C ' + (cx + s * 0.58) + ' ' + (cy - s) + ', ' + (cx + s * 1.15) + ' ' + (cy - s * 0.22) + ', ' + cx + ' ' + (cy + s * 0.62),
    'Z',
  ].join(' ')
}

/**
 * A tiny five-petal flower. All five petals share one region id so they fill
 * as a single bloom with one tap, and the centre gets its own id.
 */
function flower(f, cx, cy, r, petalId, centreId) {
  let out = '<g>'
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    const px = (cx + Math.cos(a) * r).toFixed(1)
    const py = (cy + Math.sin(a) * r).toFixed(1)
    out +=
      '<circle data-fill="' + petalId + '" data-label="a wildflower" cx="' + px + '" cy="' + py +
      '" r="' + (r * 0.62).toFixed(1) + '" fill="' + f(petalId) + '" stroke-width="3"/>'
  }
  out +=
    '<circle data-fill="' + centreId + '" data-label="a flower centre" cx="' + cx + '" cy="' + cy +
    '" r="' + (r * 0.42).toFixed(1) + '" fill="' + f(centreId) + '" stroke-width="3"/></g>'
  return out
}

/* ========================================================================= */
/* 1. Cocoa & the rainy window                                               */
/* ========================================================================= */

const cocoaPalette = {
  wall: '#F4E7DA',
  sky: '#C2DCE8',
  hill: '#C3D5BC',
  moon: '#F6E3A8',
  sill: '#EBD4BC',
  floor: '#E3D3C4',
  mugA: '#F3C4CB',
  mugB: '#C2DCE8',
  cocoaA: '#B98A6B',
  cocoaB: '#B98A6B',
  heart: '#E39BA6',
  bookA: '#D9CDE8',
  bookB: '#F6E3A8',
  bookC: '#C3D5BC',
  pot: '#DFA98E',
  leaf: '#9DB795',
}

const drawCocoa = (f) => `
  <rect data-fill="wall" data-label="the wall" x="0" y="0" width="600" height="600" fill="${f('wall')}" stroke="none"/>

  <!-- what we can see through the glass -->
  <rect data-fill="sky" data-label="the rainy sky" x="72" y="56" width="456" height="360" rx="18" fill="${f('sky')}"/>
  <circle data-fill="moon" data-label="the moon" cx="452" cy="128" r="34" fill="${f('moon')}"/>
  <path data-fill="hill" data-label="the far hills" d="M72 338 q64 -54 132 -16 q60 34 116 -6 q56 -40 110 6 q40 24 98 4 V416 H72 Z" fill="${f('hill')}"/>

  <!-- rain -->
  <g stroke-width="3.5" opacity="0.75" fill="none">
    <path d="M118 92 l-12 34"/><path d="M172 76 l-12 34"/><path d="M228 104 l-12 34"/>
    <path d="M282 84 l-12 34"/><path d="M336 108 l-12 34"/><path d="M392 88 l-12 34"/>
    <path d="M146 160 l-12 34"/><path d="M200 184 l-12 34"/><path d="M256 164 l-12 34"/>
    <path d="M310 188 l-12 34"/><path d="M366 168 l-12 34"/><path d="M420 192 l-12 34"/>
    <path d="M124 248 l-12 34"/><path d="M178 272 l-12 34"/><path d="M452 252 l-12 34"/>
  </g>

  <!-- frame + mullions, drawn after the rain so the lines stay crisp -->
  <rect x="72" y="56" width="456" height="360" rx="18" fill="none" stroke-width="6"/>
  <path d="M300 56 V416 M72 236 H528" stroke-width="5" fill="none"/>

  <!-- the windowsill -->
  <rect data-fill="sill" data-label="the windowsill" x="40" y="416" width="520" height="46" rx="14" fill="${f('sill')}"/>

  <!-- your mug -->
  <path data-fill="mugA" data-label="your mug" d="M144 312 L248 312 L238 402 Q196 418 154 402 Z" fill="${f('mugA')}"/>
  <path d="M248 334 Q290 344 282 376 Q276 396 250 392" fill="none" stroke-width="6"/>
  <ellipse data-fill="mugA" cx="196" cy="312" rx="52" ry="13" fill="${f('mugA')}"/>
  <ellipse data-fill="cocoaA" data-label="hot cocoa" cx="196" cy="313" rx="41" ry="9" fill="${f('cocoaA')}"/>

  <!-- my mug -->
  <path data-fill="mugB" data-label="my mug" d="M352 312 L456 312 L446 402 Q404 418 362 402 Z" fill="${f('mugB')}"/>
  <path d="M456 334 Q498 344 490 376 Q484 396 458 392" fill="none" stroke-width="6"/>
  <ellipse data-fill="mugB" cx="404" cy="312" rx="52" ry="13" fill="${f('mugB')}"/>
  <ellipse data-fill="cocoaB" data-label="hot cocoa" cx="404" cy="313" rx="41" ry="9" fill="${f('cocoaB')}"/>

  <!-- steam -->
  <g fill="none" stroke-width="4.5" opacity="0.9">
    <path d="M176 296 q-14 -24 2 -42 q16 -18 2 -38"/>
    <path d="M216 296 q12 -20 -2 -36"/>
    <path d="M384 296 q-14 -24 2 -42 q16 -18 2 -38"/>
    <path d="M424 296 q12 -20 -2 -36"/>
  </g>

  <path data-fill="heart" data-label="a little heart" d="${heart(300, 264, 26)}" fill="${f('heart')}" stroke-width="5"/>

  <!-- the floor, and the comfortable clutter on it -->
  <rect data-fill="floor" data-label="the floor" x="0" y="556" width="600" height="44" fill="${f('floor')}" stroke="none"/>
  <path d="M0 556 H600" stroke-width="5" fill="none"/>

  <g transform="rotate(-3 160 520)">
    <rect data-fill="bookA" data-label="a paperback" x="94" y="500" width="150" height="22" rx="5" fill="${f('bookA')}"/>
    <rect data-fill="bookB" data-label="a paperback" x="102" y="522" width="140" height="22" rx="5" fill="${f('bookB')}"/>
    <rect data-fill="bookC" data-label="a paperback" x="90" y="544" width="156" height="22" rx="5" fill="${f('bookC')}"/>
  </g>

  <path data-fill="pot" data-label="the plant pot" d="M436 512 L512 512 L502 560 L446 560 Z" fill="${f('pot')}"/>
  <path data-fill="leafA" data-label="a leaf" d="M474 512 q-42 -22 -34 -66 q42 12 34 66 Z" fill="${f('leafA')}"/>
  <path data-fill="leafB" data-label="a leaf" d="M474 512 q44 -16 42 -60 q-44 8 -42 60 Z" fill="${f('leafB')}"/>
  <path data-fill="leafC" data-label="a leaf" d="M474 512 q4 -46 -4 -74 q-24 34 4 74 Z" fill="${f('leafC')}"/>
`

cocoaPalette.leafA = '#9DB795'
cocoaPalette.leafB = '#C3D5BC'
cocoaPalette.leafC = '#9DB795'

/* ========================================================================= */
/* 2. Blanket-fort movie night                                               */
/* ========================================================================= */

const movieNightPalette = {
  wall2: '#EFE7F0',
  rug: '#F7D2B6',
  couch: '#C3D5BC',
  seat: '#9DB795',
  cushionA: '#F3C4CB',
  cushionB: '#F6E3A8',
  tv: '#3C3A38',
  screen: '#C2DCE8',
  tvheart: '#E39BA6',
  blanket: '#D9CDE8',
  catA: '#F6E3A8',
  catB: '#DFA98E',
  bowl: '#F3C4CB',
  corn: '#FBF2D6',
  bulbA: '#F6E3A8',
  bulbB: '#F3C4CB',
  bulbC: '#C2DCE8',
}

const BULBS = [
  [78, 100, 'bulbA'],
  [140, 118, 'bulbB'],
  [206, 116, 'bulbC'],
  [272, 96, 'bulbA'],
  [338, 78, 'bulbB'],
  [404, 72, 'bulbC'],
  [470, 80, 'bulbA'],
  [534, 100, 'bulbB'],
]

const drawBulbs = (f) =>
  BULBS.map(
    ([x, y, id]) =>
      `<g><path d="M${x} ${y - 14} v10" stroke-width="4" fill="none"/>` +
      `<circle data-fill="${id}" data-label="a fairy light" cx="${x}" cy="${y + 2}" r="13" fill="${f(id)}" stroke-width="4"/></g>`,
  ).join('')

const drawMovieNight = (f) => `
  <rect data-fill="wall2" data-label="the wall" x="0" y="0" width="600" height="600" fill="${f('wall2')}" stroke="none"/>

  <!-- string lights -->
  <path d="M8 62 Q140 126 300 82 Q460 38 592 74" fill="none" stroke-width="4"/>
  ${drawBulbs(f)}

  <!-- the telly, playing the film neither of us will finish -->
  <rect data-fill="tv" data-label="the telly" x="176" y="164" width="248" height="164" rx="16" fill="${f('tv')}"/>
  <rect data-fill="screen" data-label="the screen" x="194" y="182" width="212" height="128" rx="9" fill="${f('screen')}"/>
  <path data-fill="tvheart" data-label="the film" d="${heart(300, 244, 30)}" fill="${f('tvheart')}" stroke-width="5"/>
  <path d="M262 328 l-22 26 M338 328 l22 26 M232 356 H368" stroke-width="5" fill="none"/>

  <!-- rug, tucked in behind everything -->
  <ellipse data-fill="rug" data-label="the fuzzy rug" cx="300" cy="546" rx="256" ry="46" fill="${f('rug')}"/>

  <!-- couch -->
  <rect data-fill="couchBack" data-label="the couch" x="72" y="360" width="456" height="104" rx="34" fill="${f('couchBack')}"/>
  <rect data-fill="armL" data-label="the arm" x="36" y="392" width="66" height="112" rx="26" fill="${f('armL')}"/>
  <rect data-fill="armR" data-label="the arm" x="498" y="392" width="66" height="112" rx="26" fill="${f('armR')}"/>
  <rect data-fill="seat" data-label="the seat" x="60" y="440" width="480" height="80" rx="24" fill="${f('seat')}"/>
  <path d="M96 520 v34 M504 520 v34" stroke-width="6" fill="none"/>

  <rect data-fill="cushionA" data-label="a cushion" x="120" y="378" width="86" height="72" rx="18" transform="rotate(-7 163 414)" fill="${f('cushionA')}"/>
  <rect data-fill="cushionB" data-label="a cushion" x="398" y="378" width="86" height="72" rx="18" transform="rotate(8 441 414)" fill="${f('cushionB')}"/>

  <!-- the blanket we always fight over -->
  <path data-fill="blanket" data-label="the blanket" d="M300 402 q64 -18 118 8 q44 22 40 66 q-4 42 -40 54 q-40 14 -74 -6 q-30 -18 -30 -52 Z" fill="${f('blanket')}"/>
  <path d="M330 470 q42 -14 86 4 M322 502 q46 -12 90 6" fill="none" stroke-width="4" opacity="0.8"/>

  <!-- two cats, entirely uninterested in the film -->
  <ellipse data-fill="catA" data-label="the loaf cat" cx="182" cy="470" rx="56" ry="34" fill="${f('catA')}"/>
  <path data-fill="catA" d="M130 421 L124 376 L150 402 Z" fill="${f('catA')}"/>
  <path data-fill="catA" d="M190 421 L196 376 L170 402 Z" fill="${f('catA')}"/>
  <circle data-fill="catA" cx="160" cy="432" r="32" fill="${f('catA')}"/>
  <path d="M148 428 h.01 M172 428 h.01" stroke-width="8" fill="none"/>
  <path d="M154 444 q6 6 12 0" fill="none" stroke-width="4"/>
  <path d="M236 464 q34 -6 30 -34" fill="none" stroke-width="6"/>

  <ellipse data-fill="catB" data-label="the sleepy cat" cx="420" cy="478" rx="48" ry="28" fill="${f('catB')}"/>
  <path data-fill="catB" d="M398 437 L391 400 L414 422 Z" fill="${f('catB')}"/>
  <path data-fill="catB" d="M446 437 L453 400 L430 422 Z" fill="${f('catB')}"/>
  <circle data-fill="catB" cx="422" cy="446" r="26" fill="${f('catB')}"/>
  <path d="M408 442 q6 6 12 0 M426 442 q6 6 12 0" fill="none" stroke-width="4"/>
  <path d="M372 486 q-30 -2 -32 -28" fill="none" stroke-width="6"/>

  <!-- popcorn, mostly on the floor -->
  <path data-fill="bowl" data-label="the popcorn bowl" d="M244 528 Q300 588 356 528 Z" fill="${f('bowl')}"/>
  <ellipse data-fill="bowl" cx="300" cy="528" rx="56" ry="13" fill="${f('bowl')}"/>
  <circle data-fill="cornA" data-label="popcorn" cx="276" cy="516" r="13" fill="${f('cornA')}" stroke-width="3.5"/>
  <circle data-fill="cornB" data-label="popcorn" cx="304" cy="508" r="15" fill="${f('cornB')}" stroke-width="3.5"/>
  <circle data-fill="cornC" data-label="popcorn" cx="330" cy="518" r="12" fill="${f('cornC')}" stroke-width="3.5"/>
  <circle data-fill="cornD" data-label="popcorn" cx="212" cy="566" r="12" fill="${f('cornD')}" stroke-width="3.5"/>
  <circle data-fill="cornE" data-label="popcorn" cx="392" cy="558" r="11" fill="${f('cornE')}" stroke-width="3.5"/>
`

movieNightPalette.couchBack = '#C3D5BC'
movieNightPalette.armL = '#C3D5BC'
movieNightPalette.armR = '#C3D5BC'
movieNightPalette.cornA = '#FBF2D6'
movieNightPalette.cornB = '#FBF2D6'
movieNightPalette.cornC = '#FBF2D6'
movieNightPalette.cornD = '#FBF2D6'
movieNightPalette.cornE = '#FBF2D6'

/* ========================================================================= */
/* 3. The picnic                                                             */
/* ========================================================================= */

const picnicPalette = {
  sky2: '#DCEEF5',
  sun: '#F6E3A8',
  cloudA: '#FFFFFF',
  cloudB: '#FFFFFF',
  hills: '#C3D5BC',
  grass: '#9DB795',
  trunk: '#C08D6A',
  canopyA: '#8FB08A',
  canopyB: '#A6C0A0',
  canopyC: '#A6C0A0',
  treeheart: '#E39BA6',
  blanket2: '#F3C4CB',
  basket: '#DFA98E',
  basketLid: '#C08D6A',
  melon: '#F09A9D',
  cupA: '#C2DCE8',
  cupB: '#D9CDE8',
}

const drawPicnic = (f) => `
  <rect data-fill="sky2" data-label="the sky" x="0" y="0" width="600" height="600" fill="${f('sky2')}" stroke="none"/>

  <!-- an unreasonably cheerful sun -->
  <circle data-fill="sun" data-label="the sun" cx="94" cy="88" r="46" fill="${f('sun')}"/>
  <g stroke-width="5" fill="none">
    <path d="M94 18 v-14 M94 158 v14 M24 88 h-14 M164 88 h14"/>
    <path d="M45 39 l-10 -10 M143 137 l10 10 M143 39 l10 -10 M45 137 l-10 10"/>
  </g>

  <!-- clouds -->
  <path data-fill="cloudA" data-label="a cloud" d="M300 96 q10 -32 44 -26 q14 -30 48 -20 q34 -6 38 30 q30 6 22 34 H298 q-12 -10 2 -18 Z" fill="${f('cloudA')}"/>
  <path data-fill="cloudB" data-label="a cloud" d="M452 186 q8 -24 34 -20 q12 -22 38 -14 q26 -4 28 24 q24 4 16 26 H450 q-10 -8 2 -16 Z" fill="${f('cloudB')}"/>

  <!-- two birds who have already spotted the sandwiches -->
  <g fill="none" stroke-width="4.5">
    <path d="M196 150 q16 -16 32 0 q16 -16 32 0"/>
    <path d="M258 106 q11 -11 22 0 q11 -11 22 0"/>
  </g>

  <path data-fill="hills" data-label="the far hills" d="M0 356 q80 -70 168 -22 q76 42 148 -8 q78 -54 152 4 q60 44 132 12 V400 H0 Z" fill="${f('hills')}"/>
  <rect data-fill="grass" data-label="the grass" x="0" y="386" width="600" height="214" fill="${f('grass')}" stroke="none"/>
  <path d="M0 386 q150 -16 300 0 q150 16 300 0" fill="none" stroke-width="5"/>

  <!-- the tree we always sit under -->
  <path data-fill="trunk" data-label="the tree trunk" d="M480 476 q-14 -80 -6 -136 h40 q10 58 -2 136 Z" fill="${f('trunk')}"/>
  <circle data-fill="canopyB" data-label="the leaves" cx="416" cy="308" r="52" fill="${f('canopyB')}" stroke-width="5"/>
  <circle data-fill="canopyC" data-label="the leaves" cx="566" cy="310" r="48" fill="${f('canopyC')}" stroke-width="5"/>
  <circle data-fill="canopyA" data-label="the leaves" cx="494" cy="272" r="82" fill="${f('canopyA')}" stroke-width="5"/>
  <path d="M452 340 v30" fill="none" stroke-width="4"/>
  <path data-fill="treeheart" data-label="a heart in the tree" d="${heart(452, 386, 20)}" fill="${f('treeheart')}" stroke-width="4.5"/>

  <!-- the blanket -->
  <path data-fill="blanket2" data-label="the picnic blanket" d="M52 476 L336 442 L406 552 L104 592 Z" fill="${f('blanket2')}"/>
  <g fill="none" stroke-width="3.5" opacity="0.75">
    <path d="M146 465 L206 573 M240 454 L300 563 M76 502 L364 466 M92 546 L386 508"/>
  </g>

  <!-- the basket, packed by whoever was less late -->
  <path data-fill="basket" data-label="the picnic basket" d="M182 418 L292 418 L282 486 Q237 498 192 486 Z" fill="${f('basket')}"/>
  <path d="M196 418 q41 -56 82 0" fill="none" stroke-width="6"/>
  <rect data-fill="basketLid" x="174" y="404" width="126" height="20" rx="7" fill="${f('basketLid')}"/>
  <g fill="none" stroke-width="3.5" opacity="0.8">
    <path d="M188 444 H286 M191 466 H283 M212 428 v56 M237 428 v60 M262 428 v56"/>
  </g>

  <!-- watermelon, obviously -->
  <path data-fill="rind" data-label="watermelon rind" d="M68 540 A58 58 0 0 1 184 540 Z" fill="${f('rind')}"/>
  <path data-fill="melon" data-label="watermelon" d="M78 540 A48 48 0 0 1 174 540 Z" fill="${f('melon')}"/>
  <g stroke-width="3" fill="none"><path d="M110 522 h.01 M126 512 h.01 M144 524 h.01"/></g>

  <!-- two cups, one of which will get knocked over -->
  <path data-fill="cupA" data-label="a cup" d="M296 500 L346 500 L340 552 L302 552 Z" fill="${f('cupA')}"/>
  <path data-fill="cupB" data-label="a cup" d="M348 466 L394 466 L389 512 L353 512 Z" fill="${f('cupB')}"/>

  <!-- wildflowers -->
  ${flower(f, 44, 430, 13, 'petal1', 'bloom1')}
  ${flower(f, 556, 456, 12, 'petal2', 'bloom2')}
  ${flower(f, 470, 556, 14, 'petal3', 'bloom3')}
  ${flower(f, 540, 578, 11, 'petal4', 'bloom4')}
`

picnicPalette.rind = '#9DB795'
picnicPalette.petal1 = '#FFFFFF'
picnicPalette.petal2 = '#F3C4CB'
picnicPalette.petal3 = '#FFFFFF'
picnicPalette.petal4 = '#D9CDE8'
picnicPalette.bloom1 = '#F6E3A8'
picnicPalette.bloom2 = '#F6E3A8'
picnicPalette.bloom3 = '#F6E3A8'
picnicPalette.bloom4 = '#F6E3A8'

/* ========================================================================= */

export const SCENES = {
  cocoa: { palette: cocoaPalette, draw: drawCocoa },
  movieNight: { palette: movieNightPalette, draw: drawMovieNight },
  picnic: { palette: picnicPalette, draw: drawPicnic },
}

export const SCENE_SIZE = 600

/**
 * Build the inner markup for a scene.
 * @param {string} sceneId key of SCENES
 * @param {'color'|'lines'} mode
 * @param {Record<string,string>} [fills] live colours, keyed by region id
 * @param {{emptyFill?: string}} [options] what an uncoloured region looks like
 */
export function sceneBody(sceneId, mode, fills, options = {}) {
  const scene = SCENES[sceneId] || SCENES.cocoa
  const empty = options.emptyFill || 'transparent'
  const lookup =
    mode === 'color'
      ? (id) => scene.palette[id] || '#FFFFFF'
      : (id) => (fills && fills[id]) || empty
  return scene.draw(lookup)
}

/**
 * A full standalone <svg> document string.
 * `options.stroke === 'none'` drops all the line work and keeps only the
 * fills — see sceneFillLayer below for why that is useful.
 */
export function sceneSvg(sceneId, mode, fills, options = {}) {
  const stroke = options.stroke === 'none' ? 'none' : INK
  const body = sceneBody(sceneId, mode, fills, options)
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
    SCENE_SIZE +
    ' ' +
    SCENE_SIZE +
    '" width="' +
    SCENE_SIZE +
    '" height="' +
    SCENE_SIZE +
    '">' +
    '<g stroke="' +
    stroke +
    '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">' +
    body +
    '</g></svg>'
  )
}

/* ---------------------------------------------------------------------------
 * The colouring page is stacked as three sheets:
 *
 *   paint layer  — her flood fills, outlines removed
 *   brush canvas — her strokes
 *   ink layer    — every region painted flat WHITE, outlines on top
 *
 * The ink layer being opaque white is the important part. It is composited
 * with `mix-blend-mode: multiply`, and white is the identity for multiply — so
 * the colours underneath come through untouched while the black outlines stay
 * black. What we buy with that trick is occlusion: because the sheet is
 * genuinely opaque, a mug painted over a hillside hides the hillside's outline
 * exactly as it does in the colour version. Leave the regions transparent
 * instead and every background line ghosts straight through the foreground,
 * which is what turns a colouring page into spaghetti.
 * ------------------------------------------------------------------------- */

/** Sheet 1: her flood fills, with every outline removed. */
export function sceneFillLayer(sceneId, fills) {
  return sceneSvg(sceneId, 'lines', fills, { stroke: 'none' })
}

/** Sheet 3: outlines over flat white, for multiply compositing. */
export function sceneInkLayer(sceneId) {
  return sceneSvg(sceneId, 'lines', null, { emptyFill: '#FFFFFF' })
}

/** The same document as a data: URI — usable as an <img src> or CSS background. */
export function sceneDataUri(sceneId, mode, fills) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sceneSvg(sceneId, mode, fills))
}
