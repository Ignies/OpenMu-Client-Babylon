/**
 * Builds `src/common/itemIconFit.ts` from the pixels in `public/items` and the
 * original's own icon scales (`src/common/itemIconScale.ts`).
 *
 *   bun run tools/itemIconFit.ts
 *
 * The pack renders every item at one world scale into a canvas sized by the
 * item's inventory footprint, so a small item covers a small part of its own
 * PNG - a jewel is 21 x 25 opaque pixels inside 120 x 126 - and fitting that
 * whole canvas into the square left a few pixels of jewel.
 *
 * How big each item should be is not "as big as the square": the original
 * hand-tunes `o->Scale` per item type in RenderObjectScreen, and a ring really
 * is meant to be smaller than a jewel. Since the pack shares one world scale,
 * the displayed size the original would give an item is its scale times a
 * single constant, and the zoom that gets there is
 *
 *   zoom = SCALE_TO_ZOOM * o->Scale / containFit
 *
 * where `containFit` is what `max-width/height: 100%` already does to the
 * canvas. The measured opaque box caps it so nothing can spill out of its
 * square whatever the container's aspect.
 *
 * Re-run whenever files are added to or removed from `public/items`.
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';
import { ITEM_ICON_SCALE, ITEM_ICON_SCALE_DEFAULT } from '../src/common/itemIconScale';
import items from '../src/common/items.json';

const ROOT = join(import.meta.dir, '..');
const ITEMS_DIR = join(ROOT, 'public', 'items');
const OUT = join(ROOT, 'src', 'common', 'itemIconFit.ts');

const FILE = /^item_(\d+)_(\d+)_(\d+)(_e|_a)?\.png$/;

/** Below this the pixel is the render's own anti-aliased fringe, not the item. */
const ALPHA_FLOOR = 8;
/** One inventory square, the unit both the grid and the icon canvases are cut to. */
const SQUARE = 20;
/**
 * Turns the original's `o->Scale` into a zoom on the pack. Calibrated so the
 * items that already looked right keep their size (armour, wings, jewels) and
 * the ones the table says are small come back down (rings, scrolls).
 */
const SCALE_TO_ZOOM = 180;
/** Leaves the item off the square's border when the cap binds. */
const MARGIN = 0.92;
/** Under this the zoom is not worth an entry. */
const MIN_ZOOM = 1.05;

type Box = { zoom: number; dx: number; dy: number };

function opaqueBox(file: string) {
  const png = PNG.sync.read(readFileSync(join(ITEMS_DIR, file)));
  const { width, height, data } = png;

  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < ALPHA_FLOOR) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  if (x1 < 0) return null;

  return { width, height, x0, y0, x1, y1 };
}

function fitOf(group: number, num: number, file: string): Box | null {
  const measured = opaqueBox(file);
  if (!measured) return null;

  const item = items.find(i => i.Group === group && i.Index === num);
  if (!item) return null;

  const { width, height, x0, y0, x1, y1 } = measured;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;

  // What `max-width/height: 100%` does to the canvas inside the item's squares.
  const contain = Math.min((item.X * SQUARE) / width, (item.Y * SQUARE) / height);
  const scale = ITEM_ICON_SCALE[`${group}_${num}`] ?? ITEM_ICON_SCALE_DEFAULT;
  const cap = Math.min(width / w, height / h) * MARGIN;

  return {
    zoom: Math.min((SCALE_TO_ZOOM * scale) / contain, cap),
    // The content is drawn centred, but only roughly; the zoom is about the
    // canvas centre, so the drift has to come off first or it scales too.
    dx: 0.5 - (x0 + x1 + 1) / 2 / width,
    dy: 0.5 - (y0 + y1 + 1) / 2 / height,
  };
}

/** The plain tints first: the `_e` aura would measure wider than the item. */
const RANK = (name: string) => (name.includes('_e.') ? 2 : name.includes('_a.') ? 1 : 0);

const candidates = new Map<string, { file: string; group: number; num: number }>();

for (const name of readdirSync(ITEMS_DIR)) {
  const m = FILE.exec(name);
  if (!m) continue;
  const key = `${m[1]}_${m[2]}`;
  const held = candidates.get(key);
  if (!held || RANK(name) < RANK(held.file)) {
    candidates.set(key, { file: name, group: Number(m[1]), num: Number(m[2]) });
  }
}

const fits = new Map<string, Box>();

for (const [key, { file, group, num }] of candidates) {
  const box = fitOf(group, num, file);
  if (!box || box.zoom < MIN_ZOOM) continue;
  fits.set(key, box);
}

const keys = [...fits.keys()].sort((a, b) => {
  const [ga, na] = a.split('_').map(Number);
  const [gb, nb] = b.split('_').map(Number);
  return ga - gb || na - nb;
});

const round = (n: number, places: number) => Number(n.toFixed(places));

const lines = keys.map(key => {
  const box = fits.get(key)!;
  return `  '${key}': [${round(box.zoom, 2)}, ${round(box.dx, 3)}, ${round(box.dy, 3)}],`;
});

const source = `// GENERATED by tools/itemIconFit.ts - do not edit.
// ${keys.length} of ${candidates.size} items.
//
// \`group_num\` → [zoom, dx, dy]: how far the icon has to be blown up to reach
// the size the original draws that item at, and the drift off centre that has
// to come off first. Consumed by ui/components/itemIcon.
export const ITEM_ICON_FIT: Readonly<Record<string, readonly [number, number, number]>> = {
${lines.join('\n')}
};
`;

writeFileSync(OUT, source);
console.log(`wrote ${OUT}: ${keys.length} items`);
