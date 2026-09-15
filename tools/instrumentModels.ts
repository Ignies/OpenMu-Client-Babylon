/**
 * Builds the band system's instrument models from the reference image.
 *
 *   bun run tools/instrumentModels.ts            (all three)
 *   bun run tools/instrumentModels.ts guitar
 *
 * Low-poly primitives, textured with crops of
 * `references/screenshots/todo/instruments_reference.png` (a guitar, a flute
 * and an ocarina on a transparent background, top to bottom). The three are
 * found by scanning the alpha channel for the three opaque bands, so the
 * image can be re-exported at another size without touching this file.
 *
 * Written the way `bmdToGlb.ts` writes a static model: vertices in BMD space
 * scaled by 0.01 (Z along the instrument, Y its thickness, centimetres),
 * one node, `POSITION / NORMAL / TEXCOORD_0 / COLOR_0`, a PBR material with
 * roughness 1 and an embedded PNG atlas. The atlas matters beyond looks: the
 * loader only puts a GLB mesh on the item material - the one the map's
 * lights reach - when it carries an albedo texture (`modelLoader.ts
 * prepareMeshes`).
 *
 * Each model's origin is where the hand holds it; the registry's `link`
 * places it on the bone.
 */
import { Document, NodeIO } from '@gltf-transform/core';
import { existsSync } from 'fs';
import { resolve } from 'path';
import sharp from 'sharp';
import { PROJECT_ROOT } from './shared';

const SCALE = 0.01;

const OUT = `${PROJECT_ROOT}public/game-assets/Item/`;

/** The image lives in the workspace beside the repo, not in the repo. */
const REFERENCE_CANDIDATES = [
  process.env.INSTRUMENT_REFERENCE,
  resolve(PROJECT_ROOT, '../references/screenshots/todo/instruments_reference.png'),
  resolve(PROJECT_ROOT, '../../references/screenshots/todo/instruments_reference.png'),
].filter((p): p is string => !!p);

// ---- geometry --------------------------------------------------------------

type V3 = [number, number, number];
type UV = [number, number];

/** A rectangle on the atlas, in 0..1 with v down like glTF wants. */
type Rect = { u: number; v: number; w: number; h: number };

class MeshBuilder {
  positions: number[] = [];
  normals: number[] = [];
  uvs: number[] = [];
  indices: number[] = [];

  private vertex(p: V3, n: V3, uv: UV): number {
    const i = this.positions.length / 3;
    this.positions.push(p[0] * SCALE, p[1] * SCALE, p[2] * SCALE);
    this.normals.push(n[0], n[1], n[2]);
    this.uvs.push(uv[0], uv[1]);
    return i;
  }

  /** A flat-shaded triangle; the normal comes from the winding. */
  tri(a: V3, b: V3, c: V3, ua: UV, ub: UV, uc: UV): void {
    const n = normalOf(a, b, c);
    const i = this.vertex(a, n, ua);
    const j = this.vertex(b, n, ub);
    const k = this.vertex(c, n, uc);
    this.indices.push(i, j, k);
  }

  quad(a: V3, b: V3, c: V3, d: V3, ua: UV, ub: UV, uc: UV, ud: UV): void {
    this.tri(a, b, c, ua, ub, uc);
    this.tri(a, c, d, ua, uc, ud);
  }

  get triangles(): number {
    return this.indices.length / 3;
  }

  /**
   * Every triangle added since `from` must face away from `centre`: the
   * normal comes from the winding, so a face wound the wrong way is a face
   * the game culls from outside and shows from inside - the flute's wall,
   * the guitar's top and the ocarina's body all shipped that way once.
   * Closed convex shapes only; a flat disc checks its own normal.
   */
  assertOutward(from: number, centre: V3, what: string): void {
    let inward = 0;
    for (let t = from * 3; t < this.indices.length; t += 3) {
      const n = this.normalAt(this.indices[t]);
      const c = this.centreOf(t);
      if ((c[0] - centre[0]) * n[0] + (c[1] - centre[1]) * n[1] + (c[2] - centre[2]) * n[2] <= 0) inward++;
    }
    if (inward) throw new Error(`${what}: ${inward} of ${this.triangles - from} triangles face inward`);
  }

  private normalAt(vertex: number): V3 {
    return [this.normals[vertex * 3], this.normals[vertex * 3 + 1], this.normals[vertex * 3 + 2]];
  }

  private centreOf(index: number): V3 {
    const c: V3 = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const v = this.indices[index + k] * 3;
      c[0] += this.positions[v] / 3;
      c[1] += this.positions[v + 1] / 3;
      c[2] += this.positions[v + 2] / 3;
    }
    return [c[0] / SCALE, c[1] / SCALE, c[2] / SCALE];
  }
}

function normalOf(a: V3, b: V3, c: V3): V3 {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const x = uy * vz - uz * vy;
  const y = uz * vx - ux * vz;
  const z = ux * vy - uy * vx;
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

function inRect(r: Rect, s: number, t: number): UV {
  return [r.u + s * r.w, r.v + t * r.h];
}

/** One texel: a solid patch on the atlas. */
function solid(r: Rect): UV {
  return [r.u + r.w / 2, r.v + r.h / 2];
}

/**
 * A box from `min` to `max` (cm). Faces along Z (the length) take `side`
 * with s along Z and t along the other axis; the two ends take `cap`.
 */
function box(m: MeshBuilder, min: V3, max: V3, side: Rect, cap: Rect = side): void {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const from = m.triangles;
  const s = (z: number) => (z - z0) / (z1 - z0 || 1);
  const tx = (x: number) => (x - x0) / (x1 - x0 || 1);
  const ty = (y: number) => (y - y0) / (y1 - y0 || 1);
  // top (+Y) and bottom (-Y)
  m.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0],
    inRect(side, s(z0), tx(x0)), inRect(side, s(z1), tx(x0)), inRect(side, s(z1), tx(x1)), inRect(side, s(z0), tx(x1)));
  m.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
    inRect(side, s(z0), tx(x0)), inRect(side, s(z0), tx(x1)), inRect(side, s(z1), tx(x1)), inRect(side, s(z1), tx(x0)));
  // sides (+X, -X)
  m.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1],
    inRect(side, s(z0), ty(y0)), inRect(side, s(z0), ty(y1)), inRect(side, s(z1), ty(y1)), inRect(side, s(z1), ty(y0)));
  m.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0],
    inRect(side, s(z0), ty(y0)), inRect(side, s(z1), ty(y0)), inRect(side, s(z1), ty(y1)), inRect(side, s(z0), ty(y1)));
  // ends (+Z, -Z)
  m.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
    inRect(cap, 0, 0), inRect(cap, 1, 0), inRect(cap, 1, 1), inRect(cap, 0, 1));
  m.quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0],
    inRect(cap, 0, 0), inRect(cap, 0, 1), inRect(cap, 1, 1), inRect(cap, 1, 0));
  m.assertOutward(from, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], 'box');
}

/**
 * A cylinder along Z from `z0` to `z1`, `segments` around. The wrap takes
 * `side` with s along Z and t around; the ends take `cap` as one texel.
 */
function cylinder(m: MeshBuilder, z0: number, z1: number, radius: number, segments: number, side: Rect, cap: Rect, ry = radius): void {
  const from = m.triangles;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const p = (a: number, z: number): V3 => [Math.cos(a) * radius, Math.sin(a) * ry, z];
    // Around first, then along: with X = cos and Y = sin the other order
    // winds the wall inward.
    m.quad(p(a0, z0), p(a1, z0), p(a1, z1), p(a0, z1),
      inRect(side, 0, i / segments), inRect(side, 0, (i + 1) / segments), inRect(side, 1, (i + 1) / segments), inRect(side, 1, i / segments));
    m.tri([0, 0, z1], p(a0, z1), p(a1, z1), solid(cap), solid(cap), solid(cap));
    m.tri([0, 0, z0], p(a1, z0), p(a0, z0), solid(cap), solid(cap), solid(cap));
  }
  m.assertOutward(from, [0, 0, (z0 + z1) / 2], 'cylinder');
}

// ---- silhouettes -----------------------------------------------------------

/**
 * A column of an instrument's silhouette: an image column and the first and
 * last opaque rows in it. The reference is a photo on a transparent
 * background, so its alpha channel *is* the outline the player sees painted
 * on the model - tracing it and extruding that is what puts the model's own
 * edge under the photo's edge. The guitar body used to be two circles and the
 * ocarina an ellipsoid, and neither followed the picture.
 */
type Column = { px: number; lo: number; hi: number };

/** Alpha over this is the instrument; under it is the photo's soft fringe. */
const OPAQUE = 96;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Every column of a band's silhouette, left to right. */
async function traceColumns(file: string, band: Band): Promise<Column[]> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, channels } = info;
  const columns: Column[] = [];
  for (let px = band.left; px <= band.right; px++) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let py = band.top; py <= band.bottom; py++) {
      if (data[(py * width + px) * channels + 3] <= OPAQUE) continue;
      if (py < lo) lo = py;
      if (py > hi) hi = py;
    }
    if (hi > lo) columns.push({ px, lo, hi });
  }
  if (columns.length < 4) throw new Error('the silhouette has no width');
  return columns;
}

/**
 * The columns worth keeping: one stays when dropping it would move either
 * edge by more than `tol` pixels. The guitar's neck collapses to its two
 * ends and its bouts keep their curve - the triangles land where the outline
 * actually turns, and a step (the heel) keeps both of its sides.
 */
function decimate(columns: Column[], tol: number): Column[] {
  if (columns.length <= 2) return columns.slice();
  const kept = [columns[0]];
  let anchor = 0;
  for (let i = 2; i < columns.length; i++) {
    let straight = true;
    for (let j = anchor + 1; j < i && straight; j++) {
      const t = (columns[j].px - columns[anchor].px) / (columns[i].px - columns[anchor].px);
      straight =
        Math.abs(lerp(columns[anchor].lo, columns[i].lo, t) - columns[j].lo) <= tol &&
        Math.abs(lerp(columns[anchor].hi, columns[i].hi, t) - columns[j].hi) <= tol;
    }
    if (straight) continue;
    kept.push(columns[i - 1]);
    anchor = i - 1;
  }
  kept.push(columns[columns.length - 1]);
  return kept;
}

/**
 * How a band's pixels become model centimetres. An instrument is measured in
 * its own axes - `along` it, `across` it, and `through` its thickness - and
 * `orient` turns those into the model's, so a reshaped instrument still sits
 * in the hand the way the row's `link` was solved for.
 */
type Placement = {
  band: Band;
  /** Centimetres per image pixel. */
  cm: number;
  /** The image column the origin sits on, and the row its long axis runs down. */
  originPx: number;
  originPy: number;
  /** (across, through, along) -> model x/y/z. A rotation: the winding must hold. */
  orient: (p: V3) => V3;
  /** Where the band is painted on the atlas. */
  rect: Rect;
};

const alongCm = (p: Placement, px: number): number => (px - p.originPx) * p.cm;
const acrossCm = (p: Placement, py: number): number => (py - p.originPy) * p.cm;

/** A point of the silhouette, in model space. */
function point(p: Placement, px: number, py: number, through: number): V3 {
  return p.orient([acrossCm(p, py), through, alongCm(p, px)]);
}

/** The texel the photo has at that pixel; the map is 1:1, which is the whole point. */
function pixelUv(p: Placement, px: number, py: number): UV {
  return inRect(
    p.rect,
    (px - p.band.left) / (p.band.right - p.band.left),
    (py - p.band.top) / (p.band.bottom - p.band.top)
  );
}

/** The middle of a segment, for the outwardness check its four faces must pass. */
function segmentCentre(p: Placement, a: Column, b: Column, lo: number, hi: number): V3 {
  const px = (a.px + b.px) / 2;
  const py = (a.lo + a.hi + b.lo + b.hi) / 4;
  return point(p, px, py, (lo + hi) / 2);
}

/**
 * The silhouette as a slab with one flat face: the guitar, whose soundboard
 * and fretboard are the same plane and whose sides are a rim. `face` is where
 * that plane sits and `depth` how far the slab hangs under it at a column -
 * deep through the body, thin along the neck.
 */
function extrudeFlat(
  m: MeshBuilder,
  columns: Column[],
  p: Placement,
  face: number,
  depth: (px: number) => number,
  rim: Rect
): void {
  const at = (px: number, py: number, through: number): V3 => point(p, px, py, through);
  const uv = (px: number, py: number): UV => pixelUv(p, px, py);
  const r = solid(rim);

  for (let i = 0; i + 1 < columns.length; i++) {
    const a = columns[i];
    const b = columns[i + 1];
    const ya = face - depth(a.px);
    const yb = face - depth(b.px);
    const from = m.triangles;
    // the face, the same photo the rest of the model is painted with
    m.quad(at(a.px, a.lo, face), at(b.px, b.lo, face), at(b.px, b.hi, face), at(a.px, a.hi, face),
      uv(a.px, a.lo), uv(b.px, b.lo), uv(b.px, b.hi), uv(a.px, a.hi));
    // the back, the same photo again: a guitar is never seen from behind for long
    m.quad(at(a.px, a.lo, ya), at(a.px, a.hi, ya), at(b.px, b.hi, yb), at(b.px, b.lo, yb),
      uv(a.px, a.lo), uv(a.px, a.hi), uv(b.px, b.hi), uv(b.px, b.lo));
    // the two rims, in the body's own colour
    m.quad(at(a.px, a.lo, face), at(a.px, a.lo, ya), at(b.px, b.lo, yb), at(b.px, b.lo, face), r, r, r, r);
    m.quad(at(a.px, a.hi, ya), at(a.px, a.hi, face), at(b.px, b.hi, face), at(b.px, b.hi, yb), r, r, r, r);
    m.assertOutward(from, segmentCentre(p, a, b, Math.min(ya, yb), face), 'slab segment');
  }

  const head = columns[0];
  const tail = columns[columns.length - 1];
  const caps = m.triangles;
  const yh = face - depth(head.px);
  const yt = face - depth(tail.px);
  m.quad(at(head.px, head.lo, face), at(head.px, head.hi, face), at(head.px, head.hi, yh), at(head.px, head.lo, yh), r, r, r, r);
  m.quad(at(tail.px, tail.lo, yt), at(tail.px, tail.hi, yt), at(tail.px, tail.hi, face), at(tail.px, tail.lo, face), r, r, r, r);
  m.assertOutward(caps, [0, 0, 0], 'slab ends');
}

/**
 * The silhouette puffed into a lens: the ocarina, a clay teardrop that is
 * thickest down its own middle and closes at its outline. `half` is half the
 * thickness at the ridge, from the column's width - so the body swells and
 * the mouthpiece stays a tube.
 */
function extrudeLens(m: MeshBuilder, columns: Column[], p: Placement, half: (span: number) => number): void {
  const at = (px: number, py: number, through: number): V3 => point(p, px, py, through);
  const uv = (px: number, py: number): UV => pixelUv(p, px, py);
  const ridge = (c: Column): number => (c.lo + c.hi) / 2;
  const halfOf = (c: Column): number => half(c.hi - c.lo);

  for (let i = 0; i + 1 < columns.length; i++) {
    const a = columns[i];
    const b = columns[i + 1];
    const ha = halfOf(a);
    const hb = halfOf(b);
    const ma = ridge(a);
    const mb = ridge(b);
    const from = m.triangles;
    m.quad(at(a.px, a.lo, 0), at(b.px, b.lo, 0), at(b.px, mb, hb), at(a.px, ma, ha),
      uv(a.px, a.lo), uv(b.px, b.lo), uv(b.px, mb), uv(a.px, ma));
    m.quad(at(a.px, ma, ha), at(b.px, mb, hb), at(b.px, b.hi, 0), at(a.px, a.hi, 0),
      uv(a.px, ma), uv(b.px, mb), uv(b.px, b.hi), uv(a.px, a.hi));
    m.quad(at(a.px, a.hi, 0), at(b.px, b.hi, 0), at(b.px, mb, -hb), at(a.px, ma, -ha),
      uv(a.px, a.hi), uv(b.px, b.hi), uv(b.px, mb), uv(a.px, ma));
    m.quad(at(a.px, ma, -ha), at(b.px, mb, -hb), at(b.px, b.lo, 0), at(a.px, a.lo, 0),
      uv(a.px, ma), uv(b.px, mb), uv(b.px, b.lo), uv(a.px, a.lo));
    m.assertOutward(from, segmentCentre(p, a, b, -Math.min(ha, hb), Math.min(ha, hb)), 'lens segment');
  }

  // The ends: the cross-section there is a diamond, closed flat.
  const head = columns[0];
  const tail = columns[columns.length - 1];
  const caps = m.triangles;
  for (const [c, front] of [[head, true], [tail, false]] as const) {
    const h = halfOf(c);
    const mid = ridge(c);
    const lo = at(c.px, c.lo, 0);
    const hi = at(c.px, c.hi, 0);
    const top = at(c.px, mid, h);
    const bottom = at(c.px, mid, -h);
    const uvLo = uv(c.px, c.lo);
    const uvHi = uv(c.px, c.hi);
    const uvMid = uv(c.px, mid);
    if (front) {
      m.tri(lo, top, hi, uvLo, uvMid, uvHi);
      m.tri(lo, hi, bottom, uvLo, uvHi, uvMid);
    } else {
      m.tri(lo, hi, top, uvLo, uvHi, uvMid);
      m.tri(lo, bottom, hi, uvLo, uvMid, uvHi);
    }
  }
  m.assertOutward(caps, [0, 0, 0], 'lens ends');
}

// ---- the three instruments -------------------------------------------------

type Atlas = {
  width: number;
  height: number;
  /** Named rectangles in atlas pixels, filled from crops or solid colours. */
  rects: Record<string, { x: number; y: number; w: number; h: number }>;
};

function rectOf(atlas: Atlas, name: string): Rect {
  const r = atlas.rects[name];
  return { u: r.x / atlas.width, v: r.y / atlas.height, w: r.w / atlas.width, h: r.h / atlas.height };
}

/**
 * Guitar: the photo's own outline, extruded. The soundboard, the fretboard
 * and the head are one flat face carrying the photo 1:1, so the painted
 * sound hole, rosette, bridge and strings land exactly where the geometry
 * puts them; the slab hangs deep under the body and thin under the neck.
 * Origin at the heel, where the body ends and the hand takes the neck.
 */
const GUITAR_LENGTH = 108;
const GUITAR_FACE = 4.5;
const GUITAR_BODY_DEPTH = 9;
const GUITAR_NECK_DEPTH = 2.4;
const GUITAR_HEAD_DEPTH = 3;
/** Pixels the traced outline may be simplified by (the band is 1257 wide). */
const GUITAR_TOLERANCE = 3;

/**
 * Where the neck is: the longest thin run of columns, between the body and
 * the head. The body's own leading tip is thin too, which is why it is the
 * longest run that counts and not the first.
 */
function neckRun(columns: Column[]): { start: number; end: number } {
  const span = columns.map(c => c.hi - c.lo);
  const thin = 0.3 * Math.max(...span);
  let start = -1;
  let end = -1;
  let best = 0;
  let run = -1;
  for (let i = 0; i <= span.length; i++) {
    if (i < span.length && span[i] < thin) {
      if (run < 0) run = i;
      continue;
    }
    if (run >= 0 && i - run > best) {
      best = i - run;
      start = run;
      end = i - 1;
    }
    run = -1;
  }
  if (start < 0) throw new Error('no neck in the guitar silhouette');
  return { start, end };
}

async function buildGuitar(atlas: Atlas, file: string, band: Band): Promise<MeshBuilder> {
  const columns = await traceColumns(file, band);
  const neck = neckRun(columns);
  const heel = columns[neck.start].px;
  const nut = columns[neck.end].px;
  const p: Placement = {
    band,
    cm: GUITAR_LENGTH / (band.right - band.left),
    originPx: heel,
    originPy: (band.top + band.bottom) / 2,
    orient: q => q,
    rect: rectOf(atlas, 'guitar'),
  };
  const m = new MeshBuilder();
  const depth = (px: number): number =>
    px < heel ? GUITAR_BODY_DEPTH : px <= nut ? GUITAR_NECK_DEPTH : GUITAR_HEAD_DEPTH;
  extrudeFlat(m, decimate(columns, GUITAR_TOLERANCE), p, GUITAR_FACE, depth, rectOf(atlas, 'rim'));
  return m;
}

/**
 * Flute: one cylinder, the strip wrapped around it; origin at the middle.
 * Thicker and longer than a real one: a 2 cm tube is a hairline at the
 * game's distance.
 */
function buildFlute(atlas: Atlas): MeshBuilder {
  const m = new MeshBuilder();
  cylinder(m, -36, 36, 2.2, 14, rectOf(atlas, 'flute'), rectOf(atlas, 'fluteEnd'));
  return m;
}

/**
 * Ocarina: the photo's teardrop and its mouthpiece, traced as one outline
 * and puffed into a lens - a clay ocarina is exactly that, thickest down its
 * middle and closing at its edge. The picture stands upright in the model's
 * Z-Y plane with its thickness across, so the mouthpiece points the way the
 * row's link already expects: up and back toward the lips.
 */
const OCARINA_LENGTH = 23;
const OCARINA_HALF = 4.8;
/** Pixels the traced outline may be simplified by (the band is 601 wide). */
const OCARINA_TOLERANCE = 2;

async function buildOcarina(atlas: Atlas, file: string, band: Band): Promise<MeshBuilder> {
  const columns = await traceColumns(file, band);
  const widest = Math.max(...columns.map(c => c.hi - c.lo));
  // The body is everything past the mouthpiece; it carries the size the
  // instrument had before, so the hand still holds it the same way.
  const body = columns.findIndex(c => c.hi - c.lo > 0.45 * widest);
  const tail = columns[columns.length - 1].px;
  const p: Placement = {
    band,
    cm: OCARINA_LENGTH / (tail - columns[body].px),
    originPx: (columns[body].px + tail) / 2,
    originPy: (band.top + band.bottom) / 2,
    orient: ([a, t, l]) => [t, -a, l],
    rect: rectOf(atlas, 'ocarina'),
  };
  const m = new MeshBuilder();
  extrudeLens(m, decimate(columns, OCARINA_TOLERANCE), p, span => OCARINA_HALF * Math.sqrt(span / widest));
  return m;
}

// ---- the image --------------------------------------------------------------

type Band = { top: number; bottom: number; left: number; right: number };

/** The opaque bands of the image, top to bottom. */
async function measureBands(file: string): Promise<{ bands: Band[]; width: number; height: number }> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const rowHas = new Array<boolean>(height);
  for (let y = 0; y < height; y++) {
    let has = false;
    for (let x = 0; x < width && !has; x++) has = data[(y * width + x) * channels + 3] > 32;
    rowHas[y] = has;
  }
  const bands: Band[] = [];
  let y = 0;
  const GAP = 24;
  while (y < height) {
    while (y < height && !rowHas[y]) y++;
    if (y >= height) break;
    const top = y;
    let gap = 0;
    let bottom = y;
    while (y < height && gap < GAP) {
      if (rowHas[y]) {
        bottom = y;
        gap = 0;
      } else gap++;
      y++;
    }
    let left = width, right = 0;
    for (let yy = top; yy <= bottom; yy++) {
      for (let x = 0; x < width; x++) {
        if (data[(yy * width + x) * channels + 3] > 32) {
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }
    bands.push({ top, bottom, left, right });
  }
  return { bands, width, height };
}

type Crop = { left: number; top: number; width: number; height: number };

function sub(b: Band, x0: number, x1: number, y0: number, y1: number): Crop {
  const w = b.right - b.left + 1, h = b.bottom - b.top + 1;
  return {
    left: Math.round(b.left + w * x0),
    top: Math.round(b.top + h * y0),
    width: Math.max(1, Math.round(w * (x1 - x0))),
    height: Math.max(1, Math.round(h * (y1 - y0))),
  };
}

/** Average opaque colour of a crop - the background the crop is flattened onto. */
async function averageColour(file: string, c: Crop): Promise<{ r: number; g: number; b: number }> {
  const { data, info } = await sharp(file).extract(c).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 128) continue;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  if (n === 0) return { r: 96, g: 64, b: 32 };
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

type Fill = { kind: 'crop'; crop: Crop } | { kind: 'solid'; rgb: { r: number; g: number; b: number } };

async function paintAtlas(file: string, atlas: Atlas, fills: Record<string, Fill>): Promise<Buffer> {
  const layers: sharp.OverlayOptions[] = [];
  for (const [name, fill] of Object.entries(fills)) {
    const r = atlas.rects[name];
    if (fill.kind === 'solid') {
      layers.push({ input: { create: { width: r.w, height: r.h, channels: 4, background: { ...fill.rgb, alpha: 1 } } }, left: r.x, top: r.y });
      continue;
    }
    const bg = await averageColour(file, fill.crop);
    const input = await sharp(file)
      .extract(fill.crop)
      .flatten({ background: bg })
      .resize(r.w, r.h, { fit: 'fill' })
      .png()
      .toBuffer();
    layers.push({ input, left: r.x, top: r.y });
  }
  return sharp({ create: { width: atlas.width, height: atlas.height, channels: 4, background: { r: 80, g: 50, b: 30, alpha: 1 } } })
    .composite(layers)
    .png()
    .toBuffer();
}

// ---- assembly --------------------------------------------------------------

async function writeGlb(name: string, m: MeshBuilder, png: Buffer): Promise<void> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('mainScene');
  const root = doc.createNode(`model_${name}`);
  scene.addChild(root);
  const node = doc.createNode('node_0');
  root.addChild(node);

  const texture = doc.createTexture('atlas').setImage(new Uint8Array(png)).setMimeType('image/png');
  const material = doc
    .createMaterial()
    .setRoughnessFactor(1)
    .setMetallicFactor(0)
    .setAlphaMode('OPAQUE')
    .setBaseColorTexture(texture);

  const count = m.positions.length / 3;
  const colours = new Float32Array(count * 4).fill(1);
  const prim = doc
    .createPrimitive()
    .setMaterial(material)
    .setIndices(doc.createAccessor().setArray(new Uint16Array(m.indices)).setType('SCALAR').setBuffer(buffer))
    .setAttribute('POSITION', doc.createAccessor().setArray(new Float32Array(m.positions)).setType('VEC3').setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setArray(new Float32Array(m.normals)).setType('VEC3').setBuffer(buffer))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setArray(new Float32Array(m.uvs)).setType('VEC2').setBuffer(buffer))
    .setAttribute('COLOR_0', doc.createAccessor().setArray(colours).setType('VEC4').setBuffer(buffer));
  node.setMesh(doc.createMesh('mesh_1').addPrimitive(prim));

  const out = `${OUT}${name}.glb`;
  await Bun.write(out, '', { createPath: true });
  await new NodeIO().write(out, doc);
  console.log(`${name}: ${m.triangles} tris, ${count} verts, atlas ${(png.length / 1024).toFixed(0)} KB -> ${out}`);
}

async function main(): Promise<void> {
  const file = REFERENCE_CANDIDATES.find(p => existsSync(p));
  if (!file) {
    console.error(
      'reference image not found. Put it at references/screenshots/todo/instruments_reference.png ' +
        '(beside the repo) or set INSTRUMENT_REFERENCE=<path>.'
    );
    process.exit(1);
  }

  const { bands } = await measureBands(file);
  if (bands.length < 3) {
    console.error(`expected three instruments top to bottom in ${file}, found ${bands.length} opaque bands`);
    process.exit(1);
  }
  const [guitar, flute, ocarina] = bands;
  console.log(`reference ${file}: guitar ${JSON.stringify(guitar)}, flute ${JSON.stringify(flute)}, ocarina ${JSON.stringify(ocarina)}`);

  const wanted = new Set(process.argv.slice(2));
  const all = wanted.size === 0;

  if (all || wanted.has('guitar')) {
    // The whole photo, one crop, mapped 1:1 onto the outline traced from it -
    // so the hole, the rosette, the bridge and the strings it paints are all
    // exactly where the geometry says they are. 512 x 208 keeps the band's
    // own 2.46:1; MU's item textures are 256 and this is a hand's width on
    // screen, so anything bigger only costs download.
    const atlas: Atlas = {
      width: 512,
      height: 256,
      rects: {
        guitar: { x: 0, y: 0, w: 512, h: 208 },
        rim: { x: 0, y: 216, w: 32, h: 32 },
      },
    };
    const crop = sub(guitar, 0, 1, 0, 1);
    const png = await paintAtlas(file, atlas, {
      guitar: { kind: 'crop', crop },
      rim: { kind: 'solid', rgb: await averageColour(file, crop) },
    });
    await writeGlb('Instrument_Guitar', await buildGuitar(atlas, file, guitar), png);
  }

  if (all || wanted.has('flute')) {
    const atlas: Atlas = {
      width: 512,
      height: 64,
      rects: {
        flute: { x: 0, y: 0, w: 512, h: 48 },
        fluteEnd: { x: 0, y: 50, w: 16, h: 14 },
      },
    };
    const crop = sub(flute, 0, 1, 0, 1);
    const png = await paintAtlas(file, atlas, {
      flute: { kind: 'crop', crop },
      fluteEnd: { kind: 'solid', rgb: await averageColour(file, crop) },
    });
    await writeGlb('Instrument_Flute', buildFlute(atlas), png);
  }

  if (all || wanted.has('ocarina')) {
    // 384 x 256 is the band's own 1.5:1; the lens has no rim, so the crop is
    // the whole atlas.
    const atlas: Atlas = {
      width: 384,
      height: 256,
      rects: {
        ocarina: { x: 0, y: 0, w: 384, h: 256 },
      },
    };
    const png = await paintAtlas(file, atlas, {
      ocarina: { kind: 'crop', crop: sub(ocarina, 0, 1, 0, 1) },
    });
    await writeGlb('Instrument_Ocarina', await buildOcarina(atlas, file, ocarina), png);
  }
}

await main();
