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

/**
 * An ellipsoid with radii `rx, ry, rz`, `lat x lon` bands. The upper half
 * (+Y) maps `top` as seen from above (s along Z, t along X), the lower half
 * takes the same crop mirrored - a hand prop is never seen from below for long.
 */
function ellipsoid(m: MeshBuilder, rx: number, ry: number, rz: number, lat: number, lon: number, top: Rect): void {
  const p = (i: number, j: number): V3 => {
    const phi = (i / lat) * Math.PI; // 0 at +Y
    const th = (j / lon) * Math.PI * 2;
    return [rx * Math.sin(phi) * Math.cos(th), ry * Math.cos(phi), rz * Math.sin(phi) * Math.sin(th)];
  };
  const uv = (pt: V3): UV => inRect(top, (pt[2] + rz) / (2 * rz), (pt[0] + rx) / (2 * rx));
  const from = m.triangles;
  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      // Around (d) before down (b), like the cylinder wall.
      const a = p(i, j), b = p(i + 1, j), c = p(i + 1, j + 1), d = p(i, j + 1);
      if (i === 0) m.tri(a, c, b, uv(a), uv(c), uv(b));
      else if (i === lat - 1) m.tri(a, d, b, uv(a), uv(d), uv(b));
      else m.quad(a, d, c, b, uv(a), uv(d), uv(c), uv(b));
    }
  }
  m.assertOutward(from, [0, 0, 0], 'ellipsoid');
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
 * Guitar: body of two round bouts extruded along Y, a neck and a head along
 * +Z, six strings, a sound hole. Origin at the base of the neck, where the
 * left hand holds it. Both faces of the body take the top-view crop.
 */
function buildGuitar(atlas: Atlas): MeshBuilder {
  const m = new MeshBuilder();
  const body = rectOf(atlas, 'body');
  const neck = rectOf(atlas, 'neck');
  const head = rectOf(atlas, 'head');
  const rim = rectOf(atlas, 'rim');
  const string = rectOf(atlas, 'string');
  const hole = rectOf(atlas, 'hole');

  // Outline: lower bout r 19 at z -30, upper bout r 14 at z -11, sampled as
  // the outer envelope of the two circles - a peanut, which is what the
  // silhouette in the crop is.
  const lower = { z: -30, r: 19 };
  const upper = { z: -11, r: 14 };
  const N = 28;
  const outline: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    // Ray from the midpoint: the farther of the two circle hits.
    const cz = (lower.z + upper.z) / 2;
    let best = 0;
    for (const c of [lower, upper]) {
      const oz = cz - c.z;
      const b = 2 * oz * dz;
      const cc = oz * oz - c.r * c.r;
      const disc = b * b - 4 * cc;
      if (disc < 0) continue;
      const t = (-b + Math.sqrt(disc)) / 2;
      if (t > best) best = t;
    }
    outline.push([dx * best, cz + dz * best]);
  }
  const zMin = lower.z - lower.r, zMax = upper.z + upper.r;
  const xMax = lower.r;
  const half = 4.5;
  const uvTop = (x: number, z: number): UV => inRect(body, (z - zMin) / (zMax - zMin), (x + xMax) / (2 * xMax));
  const cz = (lower.z + upper.z) / 2;
  const bodyFrom = m.triangles;
  for (let i = 0; i < N; i++) {
    const [x0, z0] = outline[i];
    const [x1, z1] = outline[(i + 1) % N];
    // caps, fanned from the centre; the outline runs X -> Z, which seen from
    // +Y is clockwise, so the top fan takes it backwards
    m.tri([0, half, cz], [x1, half, z1], [x0, half, z0], uvTop(0, cz), uvTop(x1, z1), uvTop(x0, z0));
    m.tri([0, -half, cz], [x0, -half, z0], [x1, -half, z1], uvTop(0, cz), uvTop(x0, z0), uvTop(x1, z1));
    // rim: up first, then along the outline
    m.quad([x0, -half, z0], [x0, half, z0], [x1, half, z1], [x1, -half, z1],
      inRect(rim, i / N, 0), inRect(rim, i / N, 1), inRect(rim, (i + 1) / N, 1), inRect(rim, (i + 1) / N, 0));
  }
  m.assertOutward(bodyFrom, [0, 0, cz], 'guitar body');
  // neck: z 0..45, sits on the body top
  box(m, [-2.5, 2.5, 0], [2.5, 4.8, 45], neck, rim);
  // head: z 45..59, a touch wider
  box(m, [-3.5, 2.5, 45], [3.5, 4.8, 59], head, rim);
  // strings over the top, from the bridge (z -38) to the nut (z 45)
  for (let s = 0; s < 6; s++) {
    const x = -1.5 + s * 0.6;
    box(m, [x - 0.12, 5.2, -38], [x + 0.12, 5.45, 45], string);
  }
  // sound hole: a dark disc a hair above the top, facing up like the top
  const hz = -22, hr = 4.5, H = 12;
  const holeFrom = m.triangles;
  for (let i = 0; i < H; i++) {
    const a0 = (i / H) * Math.PI * 2, a1 = ((i + 1) / H) * Math.PI * 2;
    m.tri([0, half + 0.05, hz], [Math.cos(a1) * hr, half + 0.05, hz + Math.sin(a1) * hr], [Math.cos(a0) * hr, half + 0.05, hz + Math.sin(a0) * hr],
      solid(hole), solid(hole), solid(hole));
  }
  m.assertOutward(holeFrom, [0, 0, hz], 'sound hole');
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
 * Ocarina: an ellipsoid with the top-view crop, a short mouthpiece; origin
 * at the centre. Half again as big as a real one, for the same reason as
 * the flute: at the game's distance a fist-sized thing at the mouth is a
 * dark dot.
 */
function buildOcarina(atlas: Atlas): MeshBuilder {
  const m = new MeshBuilder();
  ellipsoid(m, 8, 5.2, 11.5, 8, 14, rectOf(atlas, 'ocarina'));
  // mouthpiece off the back end, angled up
  const clay = rectOf(atlas, 'clay');
  const seg = 8, r = 1.6;
  const base: V3 = [-2.2, 3.2, -8];
  const tip: V3 = [-5, 9, -12.5];
  const from = m.triangles;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const ring = (c: V3, a: number): V3 => [c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r];
    m.quad(ring(base, a0), ring(tip, a0), ring(tip, a1), ring(base, a1), solid(clay), solid(clay), solid(clay), solid(clay));
    m.tri(tip, ring(tip, a1), ring(tip, a0), solid(clay), solid(clay), solid(clay));
  }
  m.assertOutward(from, [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2 - 0.5, (base[2] + tip[2]) / 2], 'mouthpiece');
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
    // Body is the left half of the band, neck the middle strip, head the right end.
    // 512 square: the prop is a hand's width on screen, and MU's own item
    // textures are 256; anything bigger only costs download.
    const atlas: Atlas = {
      width: 512,
      height: 512,
      rects: {
        body: { x: 0, y: 0, w: 352, h: 288 },
        neck: { x: 0, y: 300, w: 512, h: 80 },
        head: { x: 360, y: 0, w: 150, h: 150 },
        rim: { x: 0, y: 400, w: 256, h: 48 },
        string: { x: 300, y: 400, w: 32, h: 32 },
        hole: { x: 350, y: 400, w: 32, h: 32 },
      },
    };
    const bodyCrop = sub(guitar, 0, 0.52, 0, 1);
    const png = await paintAtlas(file, atlas, {
      body: { kind: 'crop', crop: bodyCrop },
      neck: { kind: 'crop', crop: sub(guitar, 0.5, 0.82, 0.4, 0.6) },
      head: { kind: 'crop', crop: sub(guitar, 0.8, 1, 0.25, 0.75) },
      rim: { kind: 'solid', rgb: await averageColour(file, bodyCrop) },
      string: { kind: 'solid', rgb: { r: 226, g: 214, b: 180 } },
      hole: { kind: 'solid', rgb: { r: 24, g: 14, b: 8 } },
    });
    await writeGlb('Instrument_Guitar', buildGuitar(atlas), png);
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
    const atlas: Atlas = {
      width: 256,
      height: 256,
      rects: {
        ocarina: { x: 0, y: 0, w: 256, h: 224 },
        clay: { x: 0, y: 230, w: 24, h: 24 },
      },
    };
    const crop = sub(ocarina, 0, 1, 0, 1);
    const png = await paintAtlas(file, atlas, {
      ocarina: { kind: 'crop', crop },
      clay: { kind: 'solid', rgb: await averageColour(file, crop) },
    });
    await writeGlb('Instrument_Ocarina', buildOcarina(atlas), png);
  }
}

await main();
