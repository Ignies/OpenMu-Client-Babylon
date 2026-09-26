/**
 * Ticked - an effect scripted one original tick at a time. A `tick` callback
 * runs at 25 Hz, the way `MoveEffect` / `MoveJoint` / `MoveParticles` step
 * theirs, and what it asks for is drawn until the next tick:
 *
 *  - `sprite`: a one-tick billboard, the original's `CreateSprite` (drawn by
 *    `RenderSprites` the frame it was made, then gone);
 *  - `strip`: a joint's tail strip - `CreateTail`'s four corners per tail
 *    (ZzzEffectJoint.cpp:2925-2958) drawn as `RenderJoints` draws them, one
 *    or both faces, U running `(NumTails - j) / (MaxTails - 1)` along it and
 *    the joint's `Light` as the face colour (:7020-7330);
 *  - `ribbon`: an object blur (`CreateObjectBlur`, ZzzEffectBlurSpark.cpp),
 *    a strip through point pairs that loses one sample a tick;
 *  - `decal`: a one-tick `RenderTerrainAlphaBitmap` ground decal.
 *
 * For the effects whose per-tick maths a port keeps as written - a sweep laid
 * eight tails a tick, a head on an accelerating recurrence, a ring spun a
 * fixed step a tick - instead of re-deriving them as continuous curves.
 * Nothing is interpolated between ticks: the original steps at 25 Hz and so
 * does this. Strips of one kind share a mesh (`batch` of them per draw), so
 * a skill that throws dozens of short crackles costs a few draws, not dozens.
 *
 * Driven by: `effects.spawn('ticked', …)` from the skill table. Read by: nobody.
 */
import { Mesh, Texture, VertexBuffer, VertexData, type Scene, type StandardMaterial, type Vector3 } from '../libs/babylon/exports';
import type { TestScene } from '../scenes/testScene';
import { TerrainDecal } from '../common/moveTargetEffect';
import { Store } from '../store';
import {
  EFFECT_RENDERING_GROUP,
  LiveList,
  TICK,
  acquireCard,
  additiveMaterial,
  fxNow,
  keepDepthForEffects,
  releaseCard,
  setCardCell,
  WHITE,
  type Card,
  type RGB,
  type SheetCells,
} from './core';
import { addEffectGlow, releaseEffectGlow } from './glow';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Most ticks one frame may catch up on; a longer stall drops the rest rather than spiralling. */
const MAX_CATCH_UP = 5;

/** Where an unused strip segment is parked. */
const PARKED_Y = -1000;

// ---- 2. state + readers ----------------------------------------------------

/**
 * Which of a tail's two faces a strip draws: `flat` is `RENDER_FACE_TWO` (corners 0/1, the
 * joint's local X), `upright` is `RENDER_FACE_ONE` (corners 2/3, its local Z).
 */
export type StripFaces = 'both' | 'flat' | 'upright';

export interface StripOptions {
  /** The joint's `TexType` sheet (recipes.ts `TEX`). */
  texture: string;
  /** The joint's `Light` tint; `strip.light` scales it per tick. */
  colour?: RGB;
  /** `MaxTails`: the strip holds this many tails, `MaxTails - 1` segments. */
  maxTails: number;
  faces?: StripFaces;
  /** U multiplier along the strip (JOINT_THUNDER doubles it). */
  uScale?: number;
  /** JOINT_THUNDER's `WorldTime % 1000` U scroll, twice as fast on the flat face. */
  uScroll?: boolean;
  /** Per-segment face gain, `j = 0` the newest (JOINT_FORCE sub0's `(MaxTails - j) / MaxTails * 2`). */
  gain?: (j: number) => number;
  /** Strips of these options one effect keeps in one mesh (default 1). */
  batch?: number;
}

/** A joint's tails. `push` is `CreateTail`; `numTails` is the original's `NumTails` (-1 = none). */
export interface TailStrip {
  numTails: number;
  /** The face colour, the joint's `Light` as a scalar; clamped to 1 per vertex like `glColor`. */
  light: number;
  /**
   * `CreateTail` at (x, y, z) with `AngleMatrix(pitch, 0, yaw)` (MU degrees as radians,
   * client axes): the flat corners sit `half` tiles either side along the local X, the upright
   * ones along the local Z.
   */
  push(x: number, y: number, z: number, half: number, yaw: number, pitch: number): void;
}

export interface RibbonOptions {
  /** `BITMAP_BLUR + Type` (motion_blur_r for 2, Lava for 5). */
  texture: string;
  colour?: RGB;
  /** Samples the ribbon keeps (the original's 600 cap, sized to the effect). */
  maxSamples: number;
}

/**
 * An object blur (ZzzEffectBlurSpark.cpp:289-427): a strip through pairs of points, the
 * newest first. Drawn additive, U `j / N` along it, V 1 on the `p1` edge and 0 on `p2`,
 * each sample `light * (N - j) / N` bright.
 */
export interface Ribbon {
  readonly number: number;
  light: number;
  /** `AddObjectBlur`: a new newest pair. */
  add(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void;
  /** `MoveObjectBlurs`' tick: one sample fewer, the newest doubled into the freed slot. */
  age(): void;
}

export interface TickedFx {
  readonly scene: Scene;
  /** An object blur, drawn until the effect ends. */
  ribbon(opts: RibbonOptions): Ribbon;
  /**
   * A one-tick ground decal (`RenderTerrainAlphaBitmap`): `size` tiles across, turned
   * `rotationDeg`, additive, `colour` x `lum`.
   */
  decal(texture: string, colour: RGB, x: number, z: number, size: number, rotationDeg: number, lum?: number): void;
  /**
   * A one-tick billboard (`CreateSprite`): `w` x `h` tiles, rolled `roll` radians, `lum` its
   * brightness (the original's `Light` scalar over the tint). `cells` + `frame` draw one cell
   * of a sheet.
   */
  sprite(
    texture: string,
    colour: RGB,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    roll: number,
    lum?: number,
    cells?: SheetCells,
    frame?: number
  ): void;
  /** A tail strip, drawn until the effect ends or it is dropped. */
  strip(opts: StripOptions): TailStrip;
  /** A joint that died before its effect: its slot is freed now. */
  drop(strip: TailStrip): void;
}

export interface TickedOptions {
  /** One tick, `n` counting from 0 at the spawn. Return false to end. */
  tick(fx: TickedFx, n: number): boolean;
}

const live = new LiveList();

/** How many ticked effects are running (debug). */
export function tickedCount(): number {
  return live.size;
}

/** Batch meshes waiting for reuse, by texture, tint, length, faces and batch size. */
const pools = new Map<Scene, Map<string, Batch[]>>();

function copy3(src: Float32Array, s: number, dst: Float32Array, d: number): void {
  dst[d] = src[s];
  dst[d + 1] = src[s + 1];
  dst[d + 2] = src[s + 2];
}

function colourKey(c: RGB): string {
  return `${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0}`;
}

class Slot implements TailStrip {
  numTails = -1;
  light = 1;
  used = false;
  readonly tails: Float32Array;

  constructor(
    readonly batch: Batch,
    maxTails: number
  ) {
    this.tails = new Float32Array(maxTails * 12);
  }

  push(x: number, y: number, z: number, half: number, yaw: number, pitch: number): void {
    const max = this.batch.opts.maxTails;
    this.numTails = Math.min(this.numTails + 1, max - 1);
    const t = this.tails;
    if (this.numTails > 0) t.copyWithin(12, 0, this.numTails * 12);
    // AngleMatrix(pitch, 0, yaw): local X = (cos yaw, sin yaw, 0), local Z = (sin p sin yaw,
    // -sin p cos yaw, cos p), MU (x, y, z) -> client (x, z, y).
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const sp = Math.sin(pitch);
    const cp = Math.cos(pitch);
    const xx = cy * half;
    const xz = sy * half;
    const zx = sp * sy * half;
    const zy = cp * half;
    const zz = -sp * cy * half;
    t[0] = x - xx;
    t[1] = y;
    t[2] = z - xz;
    t[3] = x + xx;
    t[4] = y;
    t[5] = z + xz;
    t[6] = x - zx;
    t[7] = y - zy;
    t[8] = z - zz;
    t[9] = x + zx;
    t[10] = y + zy;
    t[11] = z + zz;
  }
}

/** One mesh holding `batch` strips of one kind. */
class Batch {
  readonly mesh: Mesh;
  readonly slots: Slot[] = [];
  opts: StripOptions;
  readonly #positions: Float32Array;
  readonly #uvs: Float32Array;
  readonly #colors: Float32Array;
  readonly #faces: number[];
  readonly #material: StandardMaterial;
  readonly #scene: Scene;

  constructor(
    scene: Scene,
    readonly key: string,
    opts: StripOptions
  ) {
    this.#scene = scene;
    this.opts = opts;
    const faces = opts.faces ?? 'both';
    // Corner pairs per face: RENDER_FACE_ONE draws 2/3, RENDER_FACE_TWO 0/1.
    this.#faces = faces === 'both' ? [2, 0] : faces === 'upright' ? [2] : [0];
    const count = Math.max(1, opts.batch ?? 1);
    for (let i = 0; i < count; i++) this.slots.push(new Slot(this, opts.maxTails));
    const verts = count * (opts.maxTails - 1) * this.#faces.length * 4;
    this.#positions = new Float32Array(verts * 3);
    this.#uvs = new Float32Array(verts * 2);
    this.#colors = new Float32Array(verts * 4);
    const normals = new Float32Array(verts * 3);
    const indices = new Uint16Array((verts / 4) * 6);
    for (let q = 0; q < verts / 4; q++) {
      const v = q * 4;
      indices[q * 6] = v;
      indices[q * 6 + 1] = v + 1;
      indices[q * 6 + 2] = v + 2;
      indices[q * 6 + 3] = v;
      indices[q * 6 + 4] = v + 2;
      indices[q * 6 + 5] = v + 3;
    }
    for (let v = 0; v < verts; v++) normals[v * 3 + 1] = 1;
    for (let i = 1; i < this.#positions.length; i += 3) this.#positions[i] = PARKED_Y;

    const mesh = new Mesh('fxTicked', scene);
    const data = new VertexData();
    data.positions = this.#positions;
    data.normals = normals;
    data.uvs = this.#uvs;
    data.colors = this.#colors;
    data.indices = indices;
    data.applyToMesh(mesh, true);
    this.#material = additiveMaterial(scene, opts.texture, opts.colour ?? WHITE);
    mesh.material = this.#material;
    mesh.hasVertexAlpha = false;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.doNotSyncBoundingInfo = true;
    mesh.renderingGroupId = EFFECT_RENDERING_GROUP;
    // Emissive art joins the effect mask, like every additive card.
    mesh.metadata = { brightMesh: true };
    keepDepthForEffects(scene);
    (scene as TestScene).look?.glow.addExcludedMesh(mesh);
    addEffectGlow(scene, mesh);
    this.mesh = mesh;
  }

  /** A free slot as a fresh joint, or null when all are taken. */
  take(opts: StripOptions): Slot | null {
    for (const s of this.slots) {
      if (s.used) continue;
      this.opts = opts;
      s.used = true;
      s.numTails = -1;
      s.light = 1;
      return s;
    }
    return null;
  }

  get empty(): boolean {
    for (const s of this.slots) if (s.used) return false;
    return true;
  }

  commit(): void {
    const o = this.opts;
    const tex = this.#material.diffuseTexture as Texture | null;
    // Until the sheet is in, the faces would be flat squares of the tint.
    this.mesh.isVisible = !!tex;
    if (tex && (o.uScroll || (o.uScale ?? 1) !== 1) && tex.wrapU !== Texture.WRAP_ADDRESSMODE) tex.wrapU = Texture.WRAP_ADDRESSMODE;
    const segments = o.maxTails - 1;
    const denom = o.maxTails - 1;
    const uScale = o.uScale ?? 1;
    const scroll = o.uScroll ? fxNow() % 1 : 0;
    const pos = this.#positions;
    const uv = this.#uvs;
    const col = this.#colors;
    let v = 0;
    for (const slot of this.slots) {
      const t = slot.tails;
      const drawn = slot.used ? slot.numTails : 0;
      for (const a of this.#faces) {
        // RENDER_FACE_ONE maps corner 2 to V = 1; RENDER_FACE_TWO maps corner 0 to V = 0. Thunder's
        // scroll runs back on face one and forward on face two (`L -= Scroll`, then `+= Scroll * 2`).
        const va = a === 2 ? 1 : 0;
        const shift = a === 0 ? scroll : -scroll;
        for (let j = 0; j < segments; j++, v += 4) {
          if (j >= drawn) {
            for (let k = 0; k < 4; k++) {
              pos[(v + k) * 3] = 0;
              pos[(v + k) * 3 + 1] = PARKED_Y;
              pos[(v + k) * 3 + 2] = 0;
              col[(v + k) * 4] = col[(v + k) * 4 + 1] = col[(v + k) * 4 + 2] = 0;
            }
            continue;
          }
          const c = j * 12 + a * 3;
          const n = (j + 1) * 12 + a * 3;
          // cur a, cur b, next b, next a
          copy3(t, c, pos, v * 3);
          copy3(t, c + 3, pos, (v + 1) * 3);
          copy3(t, n + 3, pos, (v + 2) * 3);
          copy3(t, n, pos, (v + 3) * 3);
          const l1 = ((slot.numTails - j) / denom) * uScale + shift;
          const l2 = ((slot.numTails - j - 1) / denom) * uScale + shift;
          uv[v * 2] = l1;
          uv[v * 2 + 1] = va;
          uv[v * 2 + 2] = l1;
          uv[v * 2 + 3] = 1 - va;
          uv[v * 2 + 4] = l2;
          uv[v * 2 + 5] = 1 - va;
          uv[v * 2 + 6] = l2;
          uv[v * 2 + 7] = va;
          const lum = Math.max(0, Math.min(1, slot.light * (o.gain ? o.gain(j) : 1)));
          for (let k = 0; k < 4; k++) {
            col[(v + k) * 4] = lum;
            col[(v + k) * 4 + 1] = lum;
            col[(v + k) * 4 + 2] = lum;
            col[(v + k) * 4 + 3] = 1;
          }
        }
      }
    }
    this.mesh.updateVerticesData(VertexBuffer.PositionKind, pos);
    this.mesh.updateVerticesData(VertexBuffer.UVKind, uv);
    this.mesh.updateVerticesData(VertexBuffer.ColorKind, col);
  }

  dispose(): void {
    releaseEffectGlow(this.mesh);
    (this.#scene as TestScene).look?.glow.removeExcludedMesh(this.mesh);
    // The material is core.ts's cache: never disposed with the mesh.
    this.mesh.dispose(false, false);
  }
}

function batchKey(o: StripOptions): string {
  return `${o.texture}|${colourKey(o.colour ?? WHITE)}|${o.maxTails}|${o.faces ?? 'both'}|${o.batch ?? 1}`;
}

function acquireBatch(scene: Scene, opts: StripOptions): Batch {
  const key = batchKey(opts);
  const pool = pools.get(scene)?.get(key);
  let b = pool?.pop();
  while (b && b.mesh.isDisposed()) b = pool?.pop();
  if (b) {
    b.mesh.setEnabled(true);
    return b;
  }
  return new Batch(scene, key, opts);
}

function releaseBatch(scene: Scene, b: Batch): void {
  for (const s of b.slots) s.used = false;
  b.mesh.setEnabled(false);
  let byKey = pools.get(scene);
  if (!byKey) {
    byKey = new Map();
    pools.set(scene, byKey);
  }
  let pool = byKey.get(b.key);
  if (!pool) {
    pool = [];
    byKey.set(b.key, pool);
  }
  pool.push(b);
}

/** One object blur and its mesh (`RenderObjectBlurs` / `RenderBlurSegment`). */
class RibbonMesh implements Ribbon {
  number = 0;
  light = 1;
  readonly mesh: Mesh;
  readonly #max: number;
  readonly #p1: Float32Array;
  readonly #p2: Float32Array;
  readonly #positions: Float32Array;
  readonly #uvs: Float32Array;
  readonly #colors: Float32Array;
  readonly #material: StandardMaterial;
  readonly #scene: Scene;

  constructor(
    scene: Scene,
    readonly key: string,
    opts: RibbonOptions
  ) {
    this.#scene = scene;
    this.#max = opts.maxSamples;
    this.#p1 = new Float32Array(this.#max * 3);
    this.#p2 = new Float32Array(this.#max * 3);
    const verts = (this.#max - 1) * 4;
    this.#positions = new Float32Array(verts * 3);
    this.#uvs = new Float32Array(verts * 2);
    this.#colors = new Float32Array(verts * 4);
    const normals = new Float32Array(verts * 3);
    const indices = new Uint16Array((verts / 4) * 6);
    for (let q = 0; q < verts / 4; q++) {
      const v = q * 4;
      indices.set([v, v + 1, v + 2, v, v + 2, v + 3], q * 6);
    }
    for (let v = 0; v < verts; v++) normals[v * 3 + 1] = 1;
    const mesh = new Mesh('fxTickedRibbon', scene);
    const data = new VertexData();
    data.positions = this.#positions;
    data.normals = normals;
    data.uvs = this.#uvs;
    data.colors = this.#colors;
    data.indices = indices;
    data.applyToMesh(mesh, true);
    this.#material = additiveMaterial(scene, opts.texture, opts.colour ?? WHITE);
    mesh.material = this.#material;
    mesh.hasVertexAlpha = false;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.doNotSyncBoundingInfo = true;
    mesh.renderingGroupId = EFFECT_RENDERING_GROUP;
    mesh.metadata = { brightMesh: true };
    keepDepthForEffects(scene);
    (scene as TestScene).look?.glow.addExcludedMesh(mesh);
    addEffectGlow(scene, mesh);
    this.mesh = mesh;
  }

  reset(): void {
    this.number = 0;
    this.light = 1;
  }

  add(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void {
    const n = Math.min(this.number, this.#max - 1);
    this.#p1.copyWithin(3, 0, n * 3);
    this.#p2.copyWithin(3, 0, n * 3);
    this.#p1[0] = x1;
    this.#p1[1] = y1;
    this.#p1[2] = z1;
    this.#p2[0] = x2;
    this.#p2[1] = y2;
    this.#p2[2] = z2;
    this.number = Math.min(this.number + 1, this.#max - 1);
  }

  age(): void {
    this.number = Math.max(this.number - 1, 0);
    this.#p1.copyWithin(3, 0, this.number * 3);
    this.#p2.copyWithin(3, 0, this.number * 3);
  }

  commit(): void {
    const tex = this.#material.diffuseTexture;
    this.mesh.isVisible = !!tex && this.number >= 2;
    if (!this.mesh.isVisible) return;
    const n = this.number;
    const pos = this.#positions;
    const uv = this.#uvs;
    const col = this.#colors;
    const p1 = this.#p1;
    const p2 = this.#p2;
    for (let j = 0, v = 0; j < this.#max - 1; j++, v += 4) {
      if (j >= n - 1) {
        for (let k = 0; k < 4; k++) pos[(v + k) * 3 + 1] = PARKED_Y;
        continue;
      }
      // firstTop, firstBottom, secondBottom, secondTop (ZzzEffectBlurSpark.cpp:105-114)
      copy3(p1, j * 3, pos, v * 3);
      copy3(p2, j * 3, pos, (v + 1) * 3);
      copy3(p2, (j + 1) * 3, pos, (v + 2) * 3);
      copy3(p1, (j + 1) * 3, pos, (v + 3) * 3);
      const u1 = j / n;
      const u2 = (j + 1) / n;
      const o = v * 2;
      uv[o] = u1;
      uv[o + 1] = 1;
      uv[o + 2] = u1;
      uv[o + 3] = 0;
      uv[o + 4] = u2;
      uv[o + 5] = 0;
      uv[o + 6] = u2;
      uv[o + 7] = 1;
      const l1 = Math.min(1, (this.light * (n - j)) / n);
      const l2 = Math.min(1, (this.light * (n - j - 1)) / n);
      for (let k = 0; k < 4; k++) {
        const l = k === 0 || k === 1 ? l1 : l2;
        col[(v + k) * 4] = l;
        col[(v + k) * 4 + 1] = l;
        col[(v + k) * 4 + 2] = l;
        col[(v + k) * 4 + 3] = 1;
      }
    }
    this.mesh.updateVerticesData(VertexBuffer.PositionKind, pos);
    this.mesh.updateVerticesData(VertexBuffer.UVKind, uv);
    this.mesh.updateVerticesData(VertexBuffer.ColorKind, col);
  }

  dispose(): void {
    releaseEffectGlow(this.mesh);
    (this.#scene as TestScene).look?.glow.removeExcludedMesh(this.mesh);
    this.mesh.dispose(false, false);
  }
}

/** Ribbons waiting for reuse, by texture, tint and length. */
const ribbonPools = new Map<Scene, Map<string, RibbonMesh[]>>();

function acquireRibbon(scene: Scene, opts: RibbonOptions): RibbonMesh {
  const key = `${opts.texture}|${colourKey(opts.colour ?? WHITE)}|${opts.maxSamples}`;
  const pool = ribbonPools.get(scene)?.get(key);
  let r = pool?.pop();
  while (r && r.mesh.isDisposed()) r = pool?.pop();
  if (r) {
    r.reset();
    r.mesh.setEnabled(true);
    return r;
  }
  return new RibbonMesh(scene, key, opts);
}

function releaseRibbon(scene: Scene, r: RibbonMesh): void {
  r.mesh.setEnabled(false);
  let byKey = ribbonPools.get(scene);
  if (!byKey) {
    byKey = new Map();
    ribbonPools.set(scene, byKey);
  }
  let pool = byKey.get(r.key);
  if (!pool) {
    pool = [];
    byKey.set(r.key, pool);
  }
  pool.push(r);
}

/** Largest ticked decal (tiles): MAGIC+1 sub11 grows to 3. */
const DECAL_MAX_SCALE = 4;
/** Ground decals waiting for reuse, by texture. They belong to the map: `reset` drops them. */
const decalPools = new Map<string, TerrainDecal[]>();
let decalSeq = 0;

function acquireDecal(texture: string): TerrainDecal | null {
  const world = Store.world;
  if (!world) return null;
  return decalPools.get(texture)?.pop() ?? new TerrainDecal(world, `fxTickedDecal${decalSeq++}`, texture, DECAL_MAX_SCALE);
}

function releaseDecal(texture: string, d: TerrainDecal): void {
  d.hide();
  let pool = decalPools.get(texture);
  if (!pool) {
    pool = [];
    decalPools.set(texture, pool);
  }
  pool.push(d);
}

const decalLight: [number, number, number] = [0, 0, 0];

class Fx implements TickedFx {
  readonly scene: Scene;
  readonly batches: Batch[] = [];
  readonly cards: Card[] = [];
  readonly cardMats: StandardMaterial[] = [];
  readonly ribbons: RibbonMesh[] = [];
  readonly decals: TerrainDecal[] = [];
  readonly decalTex: string[] = [];
  used = 0;
  decalsUsed = 0;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  sprite(
    texture: string,
    colour: RGB,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    roll: number,
    lum = 1,
    cells?: SheetCells,
    frame = 0
  ): void {
    const mat = additiveMaterial(this.scene, texture, colour);
    const i = this.used++;
    let card = this.cards[i];
    if (!card || this.cardMats[i] !== mat) {
      if (card) releaseCard(this.scene, card);
      card = acquireCard(this.scene, mat);
      this.cards[i] = card;
      this.cardMats[i] = mat;
    }
    card.position.set(x, y, z);
    card.scaling.set(w, h, 1);
    card.rotation.z = roll;
    let ready = !!mat.diffuseTexture;
    if (ready && cells) ready = setCardCell(card, cells, frame);
    card.visibility = ready ? lum : 0;
  }

  strip(opts: StripOptions): TailStrip {
    const key = batchKey(opts);
    for (const b of this.batches) {
      if (b.key !== key) continue;
      const s = b.take(opts);
      if (s) return s;
    }
    const b = acquireBatch(this.scene, opts);
    this.batches.push(b);
    return b.take(opts)!;
  }

  ribbon(opts: RibbonOptions): Ribbon {
    const r = acquireRibbon(this.scene, opts);
    this.ribbons.push(r);
    return r;
  }

  decal(texture: string, colour: RGB, x: number, z: number, size: number, rotationDeg: number, lum = 1): void {
    const world = Store.world;
    if (!world || size <= 0) return;
    const i = this.decalsUsed;
    let d: TerrainDecal | undefined = this.decals[i];
    if (d && this.decalTex[i] !== texture) {
      releaseDecal(this.decalTex[i], d);
      d = undefined;
    }
    if (!d) {
      const fresh = acquireDecal(texture);
      if (!fresh) return;
      d = this.decals[i] = fresh;
      this.decalTex[i] = texture;
    }
    this.decalsUsed++;
    decalLight[0] = colour[0] * lum;
    decalLight[1] = colour[1] * lum;
    decalLight[2] = colour[2] * lum;
    d.draw(world, x, z, Math.min(size, DECAL_MAX_SCALE), rotationDeg, decalLight);
  }

  drop(strip: TailStrip): void {
    const s = strip as Slot;
    s.used = false;
    const b = s.batch;
    // A batch with nothing left in it goes back to the pool at once.
    if (!b.empty) return;
    const i = this.batches.indexOf(b);
    if (i < 0) return;
    this.batches[i] = this.batches[this.batches.length - 1];
    this.batches.pop();
    releaseBatch(this.scene, b);
  }

  /** Drop the sprites and decals this tick did not ask for again. */
  trimSprites(): void {
    while (this.cards.length > this.used) {
      releaseCard(this.scene, this.cards.pop()!);
      this.cardMats.pop();
    }
    while (this.decals.length > this.decalsUsed) releaseDecal(this.decalTex.pop()!, this.decals.pop()!);
  }

  commit(): void {
    for (const b of this.batches) b.commit();
    for (const r of this.ribbons) r.commit();
  }

  release(): void {
    this.used = 0;
    this.decalsUsed = 0;
    this.trimSprites();
    for (const b of this.batches) releaseBatch(this.scene, b);
    this.batches.length = 0;
    for (const r of this.ribbons) releaseRibbon(this.scene, r);
    this.ribbons.length = 0;
  }
}

function spawn(scene: Scene, _at: Vector3, opts: TickedOptions): EffectHandle {
  const fx = new Fx(scene);
  let n = 0;
  let acc = 0;
  let alive = opts.tick(fx, 0);
  fx.trimSprites();
  fx.commit();
  return live.push({
    update(dt) {
      if (!alive) return false;
      acc += dt;
      let steps = Math.floor(acc / TICK);
      if (steps <= 0) return true;
      acc -= steps * TICK;
      if (steps > MAX_CATCH_UP) steps = MAX_CATCH_UP;
      for (let i = 0; i < steps && alive; i++) {
        fx.used = 0;
        fx.decalsUsed = 0;
        alive = opts.tick(fx, ++n);
        fx.trimSprites();
      }
      if (!alive) return false;
      fx.commit();
      return true;
    },
    release() {
      fx.release();
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
  for (const byKey of pools.values()) for (const pool of byKey.values()) for (const b of pool) b.dispose();
  pools.clear();
  for (const byKey of ribbonPools.values()) for (const pool of byKey.values()) for (const r of pool) r.dispose();
  ribbonPools.clear();
  // The decal meshes belong to the map that is going away.
  for (const pool of decalPools.values()) for (const d of pool) d.dispose();
  decalPools.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const tickedLayer: EffectLayer<TickedOptions, 'ticked'> = {
  name: 'ticked',
  update,
  reset,
  spawn,
};
