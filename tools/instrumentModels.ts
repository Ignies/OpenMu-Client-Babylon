/**
 * Builds the band system's instrument models.
 *
 *   bun run tools/instrumentModels.ts            (every instrument)
 *   bun run tools/instrumentModels.ts guitar drums
 *
 * Two kinds of source, both kept beside the repo under
 * `references/screenshots/todo/` (`INSTRUMENT_REFERENCE=<file>` and
 * `INSTRUMENT_SHEETS=<dir>` point elsewhere):
 *
 *  - `instruments_reference.png`: a guitar, a flute and an ocarina on a
 *    transparent background, top to bottom. The three are found by scanning
 *    the alpha channel for the three opaque bands, so the image can be
 *    re-exported at another size without touching this file.
 *  - `instrument_parts_*.png`: knolled photos on black - every plate, neck,
 *    shell and cymbal of an instrument laid out apart. A part is picked by a
 *    seed pixel and flood-filled out of the black; seeds and clips are given
 *    at 1536 x 1024 and scaled. The harp and the drum kit come from these.
 *
 * Geometry is low-poly and traced from the photos themselves: an outline
 * becomes a slab or a lens, a drum a cylinder with the head photo on its
 * skins. Written the way `bmdToGlb.ts` writes a static model: vertices in
 * BMD space scaled by 0.01 (centimetres), one node, `POSITION / NORMAL /
 * TEXCOORD_0 / COLOR_0`, a PBR material with roughness 1 and an embedded PNG
 * atlas. The atlas matters beyond looks: the loader only puts a GLB mesh on
 * the item material - the one the map's lights reach - when it carries an
 * albedo texture (`modelLoader.ts prepareMeshes`).
 *
 * Each model's origin is where the bone holds it; the registry's `link`
 * places it. Hand-held models run along +Z with +Y their face; the harp and
 * the drum kit stand on the root bone with +Z up and +X away from the player.
 */
import { Document, NodeIO } from '@gltf-transform/core';
import { existsSync } from 'fs';
import { resolve } from 'path';
import sharp from 'sharp';
import { PROJECT_ROOT } from './shared';

const SCALE = 0.01;

const OUT = `${PROJECT_ROOT}public/game-assets/Item/`;

const REFERENCE_DIRS = [
  resolve(PROJECT_ROOT, '../references/screenshots/todo'),
  resolve(PROJECT_ROOT, '../../references/screenshots/todo'),
];

const REFERENCE_CANDIDATES = [
  process.env.INSTRUMENT_REFERENCE,
  ...REFERENCE_DIRS.map(d => resolve(d, 'instruments_reference.png')),
].filter((p): p is string => !!p);

const SHEET_DIRS = [process.env.INSTRUMENT_SHEETS, ...REFERENCE_DIRS].filter((p): p is string => !!p);

const SHEET_FILES = {
  kit: 'instrument_parts_violin_drums_bass.png',
  harp: 'instrument_parts_harp_ukulele_electric_guitar.png',
} as const;

/** The coordinate frame sheet seeds and clips are written in. */
const SHEET_W = 1536;
const SHEET_H = 1024;

/** Brightness (max channel) over this is a part; the black under it is the table. */
const TABLE = 10;

// ---- geometry --------------------------------------------------------------

type V3 = [number, number, number];
type UV = [number, number];
type Bytes = Uint8Array<ArrayBufferLike>;

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

function add(a: V3, b: V3): V3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function mul(a: V3, k: number): V3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function unit(a: V3): V3 {
  const len = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / len, a[1] / len, a[2] / len];
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

/**
 * A cylinder from `base` along `axis` (a unit vector) for `length`,
 * `segments` around. The wrap takes `side` with s along the axis and t
 * around; the two ends take `cap` as a disc - a drum head, a cymbal face -
 * or as one texel when `capIsDisc` is off. `r1` tapers the far end.
 */
function cylinderAt(
  m: MeshBuilder,
  base: V3,
  axis: V3,
  length: number,
  r0: number,
  segments: number,
  side: Rect,
  cap: Rect,
  capIsDisc = false,
  r1 = r0
): void {
  const z = unit(axis);
  // Any perpendicular pair: the disc's own u/v axes.
  const seed: V3 = Math.abs(z[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const x = unit(cross(seed, z));
  const y = cross(z, x);
  const top = add(base, mul(z, length));
  const from = m.triangles;
  const p = (a: number, along: number, r: number): V3 =>
    add(add(base, mul(z, along)), add(mul(x, Math.cos(a) * r), mul(y, Math.sin(a) * r)));
  const disc = (a: number): UV => (capIsDisc ? inRect(cap, 0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)) : solid(cap));
  const centreUv: UV = capIsDisc ? inRect(cap, 0.5, 0.5) : solid(cap);
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    m.quad(p(a0, 0, r0), p(a1, 0, r0), p(a1, length, r1), p(a0, length, r1),
      inRect(side, 0, i / segments), inRect(side, 0, (i + 1) / segments), inRect(side, 1, (i + 1) / segments), inRect(side, 1, i / segments));
    m.tri(top, p(a0, length, r1), p(a1, length, r1), centreUv, disc(a0), disc(a1));
    m.tri(base, p(a1, 0, r0), p(a0, 0, r0), centreUv, disc(a1), disc(a0));
  }
  m.assertOutward(from, add(base, mul(z, length / 2)), 'cylinder');
}

// ---- silhouettes -----------------------------------------------------------

/**
 * A column of an outline: an image column and the first and last rows in
 * it. The reference photos' edges *are* the outlines the player sees
 * painted on the models - tracing them and extruding that is what puts a
 * model's own edge under the photo's edge. The guitar body used to be two
 * circles and the ocarina an ellipsoid, and neither followed the picture.
 */
type Column = { px: number; lo: number; hi: number };

/** A pixel box an outline lives in: a band of the reference, or a whole part. */
type Box = { x0: number; y0: number; x1: number; y1: number };

/** Alpha over this is the instrument; under it is the photo's soft fringe. */
const OPAQUE = 96;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Every column of a reference band's silhouette, left to right, by alpha. */
async function traceBandColumns(file: string, band: Box): Promise<Column[]> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, channels } = info;
  const columns: Column[] = [];
  for (let px = band.x0; px <= band.x1; px++) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let py = band.y0; py <= band.y1; py++) {
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
 * How an outline's pixels become model centimetres. An instrument is
 * measured in its own axes - `along` it, `across` it, and `through` its
 * thickness - and `orient` turns those into the model's, so a reshaped
 * instrument still sits in the hand the way the row's `link` was solved
 * for. `orient` must be a rotation: the winding has to hold.
 */
type Placement = {
  /** The pixel box the photo spans; the atlas rect maps onto it 1:1. */
  box: Box;
  /** Centimetres per image pixel along the part; across it too unless `cmAcross` says otherwise. */
  cm: number;
  cmAcross?: number;
  /** The image column the origin sits on, and the row its long axis runs down. */
  originPx: number;
  originPy: number;
  /** (across, through, along) -> model x/y/z. */
  orient: (p: V3) => V3;
  /** Where the photo is painted on the atlas. */
  rect: Rect;
};

/** A point of the outline, in model space. */
function point(p: Placement, px: number, py: number, through: number): V3 {
  return p.orient([(py - p.originPy) * (p.cmAcross ?? p.cm), through, (px - p.originPx) * p.cm]);
}

/** The texel the photo has at that pixel; the map is 1:1, which is the whole point. */
function pixelUv(p: Placement, px: number, py: number): UV {
  return inRect(p.rect, (px - p.box.x0) / (p.box.x1 - p.box.x0), (py - p.box.y0) / (p.box.y1 - p.box.y0));
}

/** The middle of a segment, for the outwardness check its four faces must pass. */
function segmentCentre(p: Placement, a: Column, b: Column, lo: number, hi: number): V3 {
  const px = (a.px + b.px) / 2;
  const py = (a.lo + a.hi + b.lo + b.hi) / 4;
  return point(p, px, py, (lo + hi) / 2);
}

/**
 * The outline as a slab with one flat face: the guitar, whose soundboard
 * and fretboard are the same plane and whose sides are a rim. `face` is where
 * that plane sits and `depth` how far the slab hangs under it at a column -
 * deep through the body, thin along the neck. The back wears the same photo:
 * a guitar is never seen from behind for long.
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
    m.quad(at(a.px, a.lo, face), at(b.px, b.lo, face), at(b.px, b.hi, face), at(a.px, a.hi, face),
      uv(a.px, a.lo), uv(b.px, b.lo), uv(b.px, b.hi), uv(a.px, a.hi));
    m.quad(at(a.px, a.lo, ya), at(a.px, a.hi, ya), at(b.px, b.hi, yb), at(b.px, b.lo, yb),
      uv(a.px, a.lo), uv(a.px, a.hi), uv(b.px, b.hi), uv(b.px, b.lo));
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
  m.assertOutward(caps, point(p, (head.px + tail.px) / 2, p.originPy, (face + Math.min(yh, yt)) / 2), 'slab ends');
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
  m.assertOutward(caps, point(p, (head.px + tail.px) / 2, p.originPy, 0), 'lens ends');
}

// ---- the reference image (guitar, flute, ocarina) --------------------------

type Layout = {
  width: number;
  height: number;
  /** Named rectangles in atlas pixels, filled from crops or solid colours. */
  rects: Record<string, { x: number; y: number; w: number; h: number }>;
};

function rectOf(layout: Layout, name: string): Rect {
  const r = layout.rects[name];
  return { u: r.x / layout.width, v: r.y / layout.height, w: r.w / layout.width, h: r.h / layout.height };
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

async function buildGuitar(layout: Layout, file: string, band: Box): Promise<MeshBuilder> {
  const columns = await traceBandColumns(file, band);
  const neck = neckRun(columns);
  const heel = columns[neck.start].px;
  const nut = columns[neck.end].px;
  const p: Placement = {
    box: band,
    cm: GUITAR_LENGTH / (band.x1 - band.x0),
    originPx: heel,
    originPy: (band.y0 + band.y1) / 2,
    orient: q => q,
    rect: rectOf(layout, 'guitar'),
  };
  const m = new MeshBuilder();
  const depth = (px: number): number =>
    px < heel ? GUITAR_BODY_DEPTH : px <= nut ? GUITAR_NECK_DEPTH : GUITAR_HEAD_DEPTH;
  extrudeFlat(m, decimate(columns, GUITAR_TOLERANCE), p, GUITAR_FACE, depth, rectOf(layout, 'rim'));
  return m;
}

/**
 * Flute: one cylinder, the strip wrapped around it; origin at the middle.
 * Thicker and longer than a real one: a 2 cm tube is a hairline at the
 * game's distance.
 */
function buildFlute(layout: Layout): MeshBuilder {
  const m = new MeshBuilder();
  cylinder(m, -36, 36, 2.2, 14, rectOf(layout, 'flute'), rectOf(layout, 'fluteEnd'));
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

async function buildOcarina(layout: Layout, file: string, band: Box): Promise<MeshBuilder> {
  const columns = await traceBandColumns(file, band);
  const widest = Math.max(...columns.map(c => c.hi - c.lo));
  // The body is everything past the mouthpiece; it carries the size the
  // instrument had before, so the hand still holds it the same way.
  const body = columns.findIndex(c => c.hi - c.lo > 0.45 * widest);
  const tail = columns[columns.length - 1].px;
  const p: Placement = {
    box: band,
    cm: OCARINA_LENGTH / (tail - columns[body].px),
    originPx: (columns[body].px + tail) / 2,
    originPy: (band.y0 + band.y1) / 2,
    orient: ([a, t, l]) => [t, -a, l],
    rect: rectOf(layout, 'ocarina'),
  };
  const m = new MeshBuilder();
  extrudeLens(m, decimate(columns, OCARINA_TOLERANCE), p, span => OCARINA_HALF * Math.sqrt(span / widest));
  return m;
}

/** The opaque bands of the reference image, top to bottom. */
async function measureBands(file: string): Promise<Box[]> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const rowHas = new Array<boolean>(height);
  for (let y = 0; y < height; y++) {
    let has = false;
    for (let x = 0; x < width && !has; x++) has = data[(y * width + x) * channels + 3] > 32;
    rowHas[y] = has;
  }
  const bands: Box[] = [];
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
    bands.push({ x0: left, y0: top, x1: right, y1: bottom });
  }
  return bands;
}

type Crop = { left: number; top: number; width: number; height: number };

function wholeBand(b: Box): Crop {
  return { left: b.x0, top: b.y0, width: b.x1 - b.x0 + 1, height: b.y1 - b.y0 + 1 };
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

type LayoutFill = { kind: 'crop'; crop: Crop } | { kind: 'solid'; rgb: { r: number; g: number; b: number } };

async function paintLayout(file: string, layout: Layout, fills: Record<string, LayoutFill>): Promise<Buffer> {
  const layers: sharp.OverlayOptions[] = [];
  for (const [name, fill] of Object.entries(fills)) {
    const r = layout.rects[name];
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
  return sharp({ create: { width: layout.width, height: layout.height, channels: 4, background: { r: 80, g: 50, b: 30, alpha: 1 } } })
    .composite(layers)
    .png()
    .toBuffer();
}

// ---- the part sheets (harp, drums) -----------------------------------------

/** A part cut out of a sheet: its pixels, and the filled outline the photo has. */
class Part {
  constructor(
    readonly name: string,
    readonly width: number,
    readonly height: number,
    /** RGB, row-major, `width * height * 3`. */
    readonly rgb: Bytes,
    /** 1 inside the outline (holes included), 0 on the table. */
    readonly mask: Bytes
  ) {}

  /** A quarter turn clockwise: the sheet's top goes to the right. */
  rotatedCw(): Part {
    const { width: w, height: h } = this;
    const rgb = new Uint8Array(this.rgb.length);
    const mask = new Uint8Array(this.mask.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = h - 1 - y, ny = x;
        const i = y * w + x, j = ny * h + nx;
        mask[j] = this.mask[i];
        rgb[j * 3] = this.rgb[i * 3];
        rgb[j * 3 + 1] = this.rgb[i * 3 + 1];
        rgb[j * 3 + 2] = this.rgb[i * 3 + 2];
      }
    }
    return new Part(this.name, h, w, rgb, mask);
  }

  /** Average colour inside the outline. */
  average(): { r: number; g: number; b: number } {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < this.mask.length; i++) {
      if (!this.mask[i]) continue;
      r += this.rgb[i * 3];
      g += this.rgb[i * 3 + 1];
      b += this.rgb[i * 3 + 2];
      n++;
    }
    if (n === 0) return { r: 96, g: 64, b: 32 };
    return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
  }

  /**
   * The photo with the table painted over in the part's own colour: the
   * outline's edge texels then blend into wood, not into black.
   */
  flattened(): Bytes {
    const avg = this.average();
    const out = new Uint8Array(this.rgb.length);
    for (let i = 0; i < this.mask.length; i++) {
      if (this.mask[i]) {
        out[i * 3] = this.rgb[i * 3];
        out[i * 3 + 1] = this.rgb[i * 3 + 1];
        out[i * 3 + 2] = this.rgb[i * 3 + 2];
      } else {
        out[i * 3] = avg.r;
        out[i * 3 + 1] = avg.g;
        out[i * 3 + 2] = avg.b;
      }
    }
    return out;
  }

  /** Every column of the outline, left to right. */
  columns(): Column[] {
    const columns: Column[] = [];
    for (let px = 0; px < this.width; px++) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let py = 0; py < this.height; py++) {
        if (!this.mask[py * this.width + px]) continue;
        if (py < lo) lo = py;
        if (py > hi) hi = py;
      }
      if (hi > lo) columns.push({ px, lo, hi });
    }
    if (columns.length < 4) throw new Error(`${this.name}: the outline has no width`);
    return columns;
  }

  /** Pixels its outline may be simplified by: a few per thousand of its length. */
  tolerance(): number {
    return Math.max(1, (2.5 * Math.max(this.width, this.height)) / 1000);
  }

  /** Laid `length` cm along +Z with +Y through it, origin at `originPx` on its centre line. */
  alongZ(rect: Rect, length: number, originPx = 0, orient: (p: V3) => V3 = q => q): Placement {
    return {
      box: { x0: 0, y0: 0, x1: this.width - 1, y1: this.height - 1 },
      cm: length / (this.width - 1),
      originPx,
      originPy: (this.height - 1) / 2,
      orient,
      rect,
    };
  }
}

function bboxOf(mask: Bytes, width: number, height: number): Box {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error('empty part');
  return { x0, y0, x1, y1 };
}

/**
 * The crop of `bbox` out of a sheet-sized `rgb` / `bright` pair, with the
 * outline filled: whatever the table reaches from the crop's border is
 * outside, the rest - the wood, and the holes in it - is the part.
 */
function cutPart(name: string, rgb: Bytes, bright: Bytes, stride: number, bbox: Box): Part {
  const w = bbox.x1 - bbox.x0 + 1;
  const h = bbox.y1 - bbox.y0 + 1;
  const crop = new Uint8Array(w * h * 3);
  const inside = new Uint8Array(w * h).fill(1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = (bbox.y0 + y) * stride + (bbox.x0 + x);
      const dst = y * w + x;
      crop[dst * 3] = rgb[src * 3];
      crop[dst * 3 + 1] = rgb[src * 3 + 1];
      crop[dst * 3 + 2] = rgb[src * 3 + 2];
      if (!bright[src]) inside[dst] = 2; // table, not yet known to be outside
    }
  }
  const stack: number[] = [];
  const push = (i: number) => {
    if (inside[i] === 2) {
      inside[i] = 0;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  for (let i = 0; i < inside.length; i++) if (inside[i] === 2) inside[i] = 1;
  return new Part(name, w, h, crop, inside);
}

/** A part's photo, flattened, as a PNG: for eyeballing what a seed picked. */
async function dumpPart(part: Part, dir: string): Promise<void> {
  await sharp(Buffer.from(part.flattened()), { raw: { width: part.width, height: part.height, channels: 3 } })
    .png()
    .toFile(resolve(dir, part.name + '.png'));
}

class Sheet {
  private constructor(
    readonly file: string,
    readonly width: number,
    readonly height: number,
    private readonly rgb: Bytes,
    private readonly bright: Bytes
  ) {}

  static async load(file: string): Promise<Sheet> {
    const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const rgb = Uint8Array.from(data);
    const bright = new Uint8Array(info.width * info.height);
    for (let i = 0; i < bright.length; i++) bright[i] = Math.max(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]) > TABLE ? 1 : 0;
    return new Sheet(file, info.width, info.height, rgb, bright);
  }

  private sx(x: number): number {
    return Math.round((x * this.width) / SHEET_W);
  }

  private sy(y: number): number {
    return Math.round((y * this.height) / SHEET_H);
  }

  /**
   * The part under `seed` (sheet coordinates at 1536 x 1024): its pixels
   * flood-filled out of the black, inside `clip` when two parts touch, with
   * `erode` pixels shaved first when hairlines join them (the harp's
   * strings) and grown back after.
   */
  part(name: string, seed: [number, number], opts: { clip?: [number, number, number, number]; erode?: number } = {}): Part {
    const { width: W, height: H } = this;
    const clip = opts.clip
      ? { x0: this.sx(opts.clip[0]), y0: this.sy(opts.clip[1]), x1: this.sx(opts.clip[2]), y1: this.sy(opts.clip[3]) }
      : { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };
    const erode = opts.erode ?? 0;
    let on = this.bright;
    for (let e = 0; e < erode; e++) on = erodeOnce(on, W, H);

    const sx = this.sx(seed[0]), sy = this.sy(seed[1]);
    if (!on[sy * W + sx]) throw new Error(`${name}: the seed (${seed}) is on the table`);
    const filled = new Uint8Array(W * H);
    const stack = [sy * W + sx];
    filled[sy * W + sx] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < clip.x0 || nx > clip.x1 || ny < clip.y0 || ny > clip.y1) continue;
        const j = ny * W + nx;
        if (on[j] && !filled[j]) {
          filled[j] = 1;
          stack.push(j);
        }
      }
    }
    let grown: Bytes = filled;
    for (let e = 0; e < erode; e++) grown = dilateOnce(grown, this.bright, W, H);
    const bbox = bboxOf(grown, W, H);
    const part = cutPart(name, this.rgb, grown, W, bbox);
    if (process.env.INSTRUMENT_PARTS_DIR) void dumpPart(part, process.env.INSTRUMENT_PARTS_DIR);
    console.log(`  ${name}: ${bbox.x0},${bbox.y0}-${bbox.x1},${bbox.y1} (${part.width}x${part.height})`);
    return part;
  }
}

function erodeOnce(on: Bytes, W: number, H: number): Bytes {
  const out = new Uint8Array(on.length);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      out[i] = on[i] && on[i - 1] && on[i + 1] && on[i - W] && on[i + W] ? 1 : 0;
    }
  }
  return out;
}

function dilateOnce(on: Bytes, within: Bytes, W: number, H: number): Bytes {
  const out = new Uint8Array(on);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (on[i] || !within[i]) continue;
      if (on[i - 1] || on[i + 1] || on[i - W] || on[i + W]) out[i] = 1;
    }
  }
  return out;
}

type Fill = { kind: 'part'; part: Part } | { kind: 'solid'; rgb: { r: number; g: number; b: number } };

/** Named rectangles packed onto one PNG, shelf by shelf, with a gutter between. */
class Atlas {
  private readonly rects = new Map<string, { x: number; y: number; w: number; h: number; fill: Fill }>();
  private shelfX = 0;
  private shelfY = 0;
  private shelfH = 0;

  constructor(readonly width: number, readonly height: number) {}

  private place(name: string, w: number, h: number, fill: Fill): Rect {
    const GUTTER = 2;
    if (this.shelfX + w > this.width) {
      this.shelfX = 0;
      this.shelfY += this.shelfH + GUTTER;
      this.shelfH = 0;
    }
    if (this.shelfY + h > this.height) throw new Error(`atlas ${this.width}x${this.height} is full at ${name}`);
    const r = { x: this.shelfX, y: this.shelfY, w, h, fill };
    this.rects.set(name, r);
    this.shelfX += w + GUTTER;
    this.shelfH = Math.max(this.shelfH, h);
    return { u: r.x / this.width, v: r.y / this.height, w: r.w / this.width, h: r.h / this.height };
  }

  /** A part scaled so its longer side is `size` texels (its shorter side follows, at least 4). */
  part(part: Part, size: number): Rect {
    const k = size / Math.max(part.width, part.height);
    const w = Math.max(4, Math.round(part.width * k));
    const h = Math.max(4, Math.round(part.height * k));
    return this.place(part.name, w, h, { kind: 'part', part });
  }

  /** A strip forced to `w` x `h` texels: a wrap that need not keep its shape. */
  strip(part: Part, w: number, h: number): Rect {
    return this.place(part.name, w, h, { kind: 'part', part });
  }

  solid(name: string, rgb: { r: number; g: number; b: number }): Rect {
    return this.place(name, 8, 8, { kind: 'solid', rgb });
  }

  async paint(): Promise<Buffer> {
    const layers: sharp.OverlayOptions[] = [];
    for (const r of this.rects.values()) {
      if (r.fill.kind === 'solid') {
        layers.push({ input: { create: { width: r.w, height: r.h, channels: 4, background: { ...r.fill.rgb, alpha: 1 } } }, left: r.x, top: r.y });
        continue;
      }
      const part = r.fill.part;
      const input = await sharp(Buffer.from(part.flattened()), { raw: { width: part.width, height: part.height, channels: 3 } })
        .resize(r.w, r.h, { fit: 'fill' })
        .png()
        .toBuffer();
      layers.push({ input, left: r.x, top: r.y });
    }
    return sharp({ create: { width: this.width, height: this.height, channels: 4, background: { r: 60, g: 40, b: 25, alpha: 1 } } })
      .composite(layers)
      .png()
      .toBuffer();
  }
}

// ---- harp ------------------------------------------------------------------

const HARP_HEIGHT = 150;
const HARP_DEPTH = 70;
const HARP_STRINGS = 22;
/** The soundbox's depth (base to top) and its width between the player's shoulders. */
const HARP_BOX_DEPTH = 14;
const HARP_BOX_WIDTH = 9;

/**
 * Harp: a floor harp standing on its base, +Z up, +X toward the back (the
 * player's side). The pillar in front, the soundbox leaning from the base
 * up to the back with its carved face turned to the side, the neck curving
 * over the top from inside the pillar to the soundbox, and the strings hung
 * straight down from neck to soundbox. Every wooden piece is its photo
 * extruded. Origin at the base, under the pillar.
 */
function buildHarp(h: { pillar: Part; neck: Part; soundbox: Part; base: Part }, atlas: Atlas): MeshBuilder {
  const pillar = h.pillar.rotatedCw();
  const soundbox = h.soundbox.rotatedCw();
  const pillarRect = atlas.part(pillar, 384);
  const neckRect = atlas.part(h.neck, 256);
  const boxRect = atlas.part(soundbox, 384);
  const baseRect = atlas.part(h.base, 128);
  const wood = atlas.solid('wood', h.soundbox.average());
  const string = atlas.solid('string', { r: 220, g: 215, b: 200 });
  const m = new MeshBuilder();

  // The pillar: vertical, its face toward +Y (the player's side is the same
  // either way), reaching the neck's top.
  const pillarP = pillar.alongZ(pillarRect, HARP_HEIGHT - 1, 0);
  extrudeFlat(m, decimate(pillar.columns(), pillar.tolerance()), pillarP, 3, () => 6, wood);

  // The soundbox: from the base's back edge up to the neck's back end. Its
  // carved face looks sideways; its taper runs front to back, wide at the
  // base (the photo's own outline, on its own scale).
  const foot: V3 = [12, 0, 2];
  const crown: V3 = [HARP_DEPTH, 0, HARP_HEIGHT - 14];
  const slant = unit([crown[0] - foot[0], 0, crown[2] - foot[2]]);
  const normal: V3 = [-slant[2], 0, slant[0]];
  const slantLen = Math.hypot(crown[0] - foot[0], crown[2] - foot[2]);
  const boxColumns = soundbox.columns();
  const boxWidest = Math.max(...boxColumns.map(c => c.hi - c.lo));
  const boxP: Placement = {
    ...soundbox.alongZ(boxRect, slantLen, 0, ([a, t, l]) =>
      add(foot, add(mul(normal, -a), add(mul([0, 1, 0], t), mul(slant, l))))
    ),
    cmAcross: HARP_BOX_DEPTH / boxWidest,
  };
  extrudeFlat(m, decimate(boxColumns, soundbox.tolerance()), boxP, HARP_BOX_WIDTH / 2, () => HARP_BOX_WIDTH, wood);

  // The neck: across the top, rooted inside the pillar, out to the crown;
  // thickness along Y.
  // Hung from its top edge, so the pillar's top is inside its thick end.
  const neckP: Placement = {
    ...h.neck.alongZ(neckRect, HARP_DEPTH + 9, 0, ([a, t, l]) => [l - 8, t, HARP_HEIGHT - a]),
    originPy: 0,
  };
  const neckColumns = h.neck.columns();
  extrudeFlat(m, decimate(neckColumns, h.neck.tolerance()), neckP, 1.5, () => 3, wood);

  // The base: a plank under everything.
  box(m, [-4, -5, 0], [HARP_DEPTH * 0.5, 5, 4], baseRect, wood);

  // The strings: from the neck's underside straight down to the soundbox's face.
  const neckUnderside = (px: number): number => {
    const c = neckColumns[Math.max(0, Math.min(neckColumns.length - 1, Math.round((px / (h.neck.width - 1)) * (neckColumns.length - 1))))];
    return HARP_HEIGHT - c.hi * neckP.cm;
  };
  for (let i = 0; i < HARP_STRINGS; i++) {
    const t = (i + 0.5) / HARP_STRINGS;
    const x = 8 + t * (HARP_DEPTH - 14);
    const zTop = neckUnderside(((x + 8) / (HARP_DEPTH + 9)) * (h.neck.width - 1)) - 0.5;
    // Where the soundbox's upper edge passes under x: along the slant, out
    // by half the photo's width there.
    const along = (x - foot[0]) / slant[0];
    const column = boxColumns[Math.max(0, Math.min(boxColumns.length - 1, Math.round((along / boxP.cm / (soundbox.width - 1)) * (boxColumns.length - 1))))];
    const half = ((column.hi - column.lo) / 2) * (boxP.cmAcross ?? boxP.cm);
    const zBottom = foot[2] + slant[2] * along + normal[2] * half;
    if (zTop <= zBottom + 2) continue;
    box(m, [x - 0.1, -0.1, zBottom], [x + 0.1, 0.1, zTop], string);
  }
  return m;
}

// ---- drums -----------------------------------------------------------------

/**
 * The kit: a stand-up kit in front of the player, +Z up, +X away from them,
 * +Y their left. A snare on its stand at waist height, the hi-hat to the
 * left, a crash to the right, the bass drum on the floor with a tom on it.
 * Shells are cylinders wearing their photo, the heads and cymbals discs
 * wearing theirs. Origin on the floor between the player's feet.
 */
type Kit = { head: Part; tom: Part; snare: Part; bassFront: Part; crash: Part; hihat: Part };

function buildDrumKit(k: Kit, atlas: Atlas): MeshBuilder {
  const head = atlas.part(k.head, 192);
  const tom = atlas.strip(k.tom, 256, 96);
  const snare = atlas.strip(k.snare, 256, 96);
  const bassFront = atlas.part(k.bassFront, 192);
  const crash = atlas.part(k.crash, 160);
  const hihat = atlas.part(k.hihat, 128);
  const chrome = atlas.solid('chrome', { r: 175, g: 178, b: 182 });
  const black = atlas.solid('black', { r: 25, g: 25, b: 25 });
  const brass = atlas.solid('brass', k.crash.average());
  const m = new MeshBuilder();
  const UP: V3 = [0, 0, 1];

  const stand = (x: number, y: number, height: number): void => {
    cylinderAt(m, [x, y, 0], UP, height, 1, 6, chrome, chrome);
    cylinderAt(m, [x, y, 0], UP, 1.5, 12, 8, black, black);
  };

  // Snare: 14" x 5.5", on a stand, tilted a little toward the player.
  stand(42, 0, 70);
  cylinderAt(m, [42, 0, 70], unit([-0.15, 0, 1]), 14, 17.5, 20, snare, head, true);
  // Bass drum: 22" x 16", on the floor, its front head toward the crowd.
  cylinderAt(m, [62, 0, 28], [1, 0, 0], 40, 28, 24, tom, head, true);
  cylinderAt(m, [101.9, 0, 28], [1, 0, 0], 0.2, 27, 24, chrome, bassFront, true);
  // Tom: 12" x 9", on the bass drum, leaning toward the player.
  cylinderAt(m, [72, 14, 60], unit([-0.35, 0, 1]), 22, 15, 20, tom, head, true);
  cylinderAt(m, [72, 14, 56], UP, 6, 1, 6, chrome, chrome);
  // Hi-hat: two 14" cymbals on a stand at the left.
  stand(38, 42, 82);
  cylinderAt(m, [38, 42, 82], UP, 0.4, 17, 24, brass, hihat, true);
  cylinderAt(m, [38, 42, 84], UP, 0.4, 17, 24, brass, hihat, true);
  cylinderAt(m, [38, 42, 82.4], UP, 4, 1.4, 6, chrome, chrome);
  // Crash: an 18" cymbal on a stand at the right, tilted toward the player.
  stand(62, -44, 104);
  cylinderAt(m, [62, -44, 104], unit([-0.3, 0.1, 1]), 0.4, 22, 28, brass, crash, true);
  return m;
}

/** A stick: a tapered cylinder, grip at the origin, tip along +Z. */
function buildDrumstick(sticks: Part, atlas: Atlas): MeshBuilder {
  const side = atlas.strip(sticks, 256, 16);
  const cap = atlas.solid('cap', sticks.average());
  const m = new MeshBuilder();
  cylinderAt(m, [0, 0, 0], [0, 0, 1], 40, 0.8, 8, side, cap, false, 0.45);
  return m;
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
  if (count > 65535) throw new Error(`${name}: ${count} vertices, over the u16 index range`);
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

async function buildFromReference(want: (id: string) => boolean): Promise<void> {
  const file = REFERENCE_CANDIDATES.find(p => existsSync(p));
  if (!file) {
    console.error(
      'reference image not found. Put it at references/screenshots/todo/instruments_reference.png ' +
        '(beside the repo) or set INSTRUMENT_REFERENCE=<path>.'
    );
    process.exit(1);
  }

  const bands = await measureBands(file);
  if (bands.length < 3) {
    console.error(`expected three instruments top to bottom in ${file}, found ${bands.length} opaque bands`);
    process.exit(1);
  }
  const [guitar, flute, ocarina] = bands;
  console.log(`reference ${file}: guitar ${JSON.stringify(guitar)}, flute ${JSON.stringify(flute)}, ocarina ${JSON.stringify(ocarina)}`);

  if (want('guitar')) {
    // The whole photo, one crop, mapped 1:1 onto the outline traced from it -
    // so the hole, the rosette, the bridge and the strings it paints are all
    // exactly where the geometry says they are. 512 x 208 keeps the band's
    // own 2.46:1; MU's item textures are 256 and this is a hand's width on
    // screen, so anything bigger only costs download.
    const layout: Layout = {
      width: 512,
      height: 256,
      rects: {
        guitar: { x: 0, y: 0, w: 512, h: 208 },
        rim: { x: 0, y: 216, w: 32, h: 32 },
      },
    };
    const crop = wholeBand(guitar);
    const png = await paintLayout(file, layout, {
      guitar: { kind: 'crop', crop },
      rim: { kind: 'solid', rgb: await averageColour(file, crop) },
    });
    await writeGlb('Instrument_Guitar', await buildGuitar(layout, file, guitar), png);
  }

  if (want('flute')) {
    const layout: Layout = {
      width: 512,
      height: 64,
      rects: {
        flute: { x: 0, y: 0, w: 512, h: 48 },
        fluteEnd: { x: 0, y: 50, w: 16, h: 14 },
      },
    };
    const crop = wholeBand(flute);
    const png = await paintLayout(file, layout, {
      flute: { kind: 'crop', crop },
      fluteEnd: { kind: 'solid', rgb: await averageColour(file, crop) },
    });
    await writeGlb('Instrument_Flute', buildFlute(layout), png);
  }

  if (want('ocarina')) {
    // 384 x 256 is the band's own 1.5:1; the lens has no rim, so the crop is
    // the whole atlas.
    const layout: Layout = {
      width: 384,
      height: 256,
      rects: {
        ocarina: { x: 0, y: 0, w: 384, h: 256 },
      },
    };
    const png = await paintLayout(file, layout, {
      ocarina: { kind: 'crop', crop: wholeBand(ocarina) },
    });
    await writeGlb('Instrument_Ocarina', await buildOcarina(layout, file, ocarina), png);
  }
}

async function loadSheet(name: keyof typeof SHEET_FILES): Promise<Sheet> {
  const dir = SHEET_DIRS.find(d => existsSync(resolve(d, SHEET_FILES[name])));
  if (!dir) {
    console.error(
      `part sheet ${SHEET_FILES[name]} not found. Put it under references/screenshots/todo (beside the repo) or set INSTRUMENT_SHEETS=<dir>.`
    );
    process.exit(1);
  }
  const file = resolve(dir, SHEET_FILES[name]);
  console.log(`sheet ${file}`);
  return Sheet.load(file);
}

async function buildFromSheets(want: (id: string) => boolean): Promise<void> {
  if (want('harp')) {
    const s = await loadSheet('harp');
    const atlas = new Atlas(512, 512);
    const model = buildHarp(
      {
        pillar: s.part('pillar', [42, 482]),
        // The neck hangs the strings, so they are shaved off before the fill
        // and the pillar it meets is clipped away.
        neck: s.part('neck', [260, 50], { clip: [118, 8, 505, 190], erode: 2 }),
        // The carved board and the shaft under it, one piece on the sheet.
        soundbox: s.part('soundbox', [460, 600]),
        base: s.part('base', [160, 975]),
      },
      atlas
    );
    await writeGlb('Instrument_Harp', model, await atlas.paint());
  }

  if (want('drums')) {
    const s = await loadSheet('kit');
    const atlas = new Atlas(512, 640);
    // Each piece is clipped to its own patch: the kit's chrome touches everything.
    const model = buildDrumKit(
      {
        head: s.part('head', [640, 170], { clip: [470, 5, 822, 318] }),
        tom: s.part('tom', [640, 411], { clip: [492, 320, 800, 502] }),
        snare: s.part('snare', [640, 560], { clip: [488, 505, 824, 604] }),
        bassFront: s.part('bassFront', [640, 790], { clip: [476, 620, 806, 960] }),
        crash: s.part('crash', [930, 330], { clip: [810, 200, 1058, 455] }),
        hihat: s.part('hihat', [985, 520], { clip: [905, 455, 1058, 588] }),
      },
      atlas
    );
    await writeGlb('Instrument_DrumKit', model, await atlas.paint());
    const stickAtlas = new Atlas(256, 32);
    const stick = buildDrumstick(s.part('sticks', [355, 992], { clip: [250, 983, 460, 999] }), stickAtlas);
    await writeGlb('Instrument_Drumstick', stick, await stickAtlas.paint());
  }
}

async function main(): Promise<void> {
  const wanted = new Set(process.argv.slice(2));
  const all = wanted.size === 0;
  const want = (id: string): boolean => all || wanted.has(id);
  if (want('guitar') || want('flute') || want('ocarina')) await buildFromReference(want);
  await buildFromSheets(want);
}

await main();
