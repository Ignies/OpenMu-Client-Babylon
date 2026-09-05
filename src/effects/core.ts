import {
  Color4,
  Constants,
  CreatePlane,
  Material,
  Mesh,
  ParticleSystem,
  StandardMaterial,
  Vector3,
  VertexBuffer,
  type Scene,
  type Texture,
} from '../libs/babylon/exports';
import { loadEffectTexture } from '../common/moveTargetEffect';
import type { Entity } from '../ecs/world';
import type { TestScene } from '../scenes/testScene';
import type { EffectHandle } from './layer';

/**
 * Shared plumbing for the effect entries (one entry per file next to this
 * one). Not an entry itself: it owns the pools every entry draws from and the
 * live-list class each entry keeps its own state in. Nothing here allocates
 * per frame:
 *
 *  - `LiveList` steps an entry's running effects from `effects.update`;
 *  - textures come from `loadEffectTexture` (one GPU texture per file, shared
 *    with the map emitters and the item auras);
 *  - additive `StandardMaterial`s are cached per (texture, colour) — MU's
 *    `EnableAlphaBlend` drawn as `(SRC_ALPHA, ONE)` so `visibility` is the
 *    fade (`ADDITIVE_ALPHA_MODE` below), and an additive material only
 *    blends when `transparencyMode` is ALPHABLEND;
 *  - billboard cards are `CreatePlane` meshes from a free-list;
 *  - particle bursts are `ParticleSystem`s cached per recipe, emitted with
 *    `manualEmitCount` so a burst is a counter bump, not an allocation;
 *  - the effects clock (`fxNow`, `delay`) sequences a skill's steps.
 *
 * `disposePools()` + `clearTimers()` are the facade's reset for all of this.
 */

/** MU's 25 Hz effect tick — the C++ counts lifetimes in these. */
export const TICK = 1 / 25;

/** One MU world unit is a centimetre; a tile is 100 of them. */
export const CM = 1 / 100;

export type RGB = readonly [number, number, number];

export const WHITE: RGB = [1, 1, 1];

/* ------------------------------------------------------------- live list */

export interface LiveEffect {
  /** Return false to finish; `release` is then called once. */
  update(dt: number): boolean;
  release(): void;
}

/**
 * An entry's running effects. `push` returns the handle the spawn hands out;
 * `update` steps them in place (swap-remove, so a burst of endings is O(n)).
 */
export class LiveList {
  readonly #live: (LiveEffect & { alive: boolean; stopped: boolean })[] = [];

  get size(): number {
    return this.#live.length;
  }

  push(fx: LiveEffect): EffectHandle {
    const item = Object.assign(fx, { alive: true, stopped: false });
    this.#live.push(item);
    return {
      get alive() {
        return item.alive;
      },
      stop() {
        item.stopped = true;
      },
    };
  }

  update(dt: number): void {
    const live = this.#live;
    for (let i = live.length - 1; i >= 0; i--) {
      const e = live[i];
      let alive = false;
      if (!e.stopped) {
        try {
          alive = e.update(dt);
        } catch (err) {
          console.warn('[effects] effect threw, dropping it', err);
        }
      }
      if (!alive) {
        live[i] = live[live.length - 1];
        live.pop();
        e.alive = false;
        release(e);
      }
    }
  }

  clear(): void {
    for (const e of this.#live) {
      e.alive = false;
      release(e);
    }
    this.#live.length = 0;
  }
}

/**
 * An effect's release runs from the frame loop, and a throw there does not
 * stop at the effect: it climbs through `effects.update` and the ECS into
 * Babylon's render loop, which never queues another frame after an exception
 * — the picture freezes while the socket and the audio carry on. `update`
 * already drops a throwing effect; its release gets the same treatment.
 */
function release(e: LiveEffect): void {
  try {
    e.release();
  } catch (err) {
    console.warn('[effects] effect release threw', err);
  }
}

/* ------------------------------------------------------------- positions */

const ZERO_OFF = { x: 0, y: 0, z: 0 };

/** World position of an entity at `height` tiles above its feet. */
export function entityPos(e: Entity, height: number, out: Vector3): Vector3 {
  const t = e.transform;
  if (!t) return out.set(0, height, 0);
  const off = t.posOffset ?? ZERO_OFF;
  return out.set(t.pos.x + off.x, t.pos.y + height, t.pos.z + off.z);
}

/** The yaw the entity is rendered with (radians, MU convention). */
export function entityYaw(e: Entity): number {
  const t = e.transform;
  return t ? (t.visualRotY ?? t.rot.y) : 0;
}

/**
 * A skinned bone's world position, or the entity at `fallbackHeight` when
 * the skeleton is not there (monsters, still-loading models). `bone` is the
 * MU bone index (the GLB adds a root, hence +1 — modelObject.ts:1099).
 */
export function bonePos(e: Entity, bone: number, out: Vector3, fallbackHeight = 0.9): Vector3 {
  const gltf = e.modelObject?.gltf;
  const node = gltf?.skeleton?.bones[bone + 1]?.getTransformNode();
  if (node && gltf && !gltf.mesh.isDisposed()) {
    return out.copyFrom(node.getAbsolutePosition());
  }
  return entityPos(e, fallbackHeight, out);
}

/**
 * A point given in a skinned bone's own frame — the original's
 * `TransformPosition(BoneTransform[bone], p, …)`. `local` is in tiles: the
 * GLB keeps bone frames in BMD bone space with centimetres scaled to tiles
 * (weaponAttachment.ts). Falls back to the entity at `fallbackHeight`.
 */
export function boneLocalPos(
  e: Entity,
  bone: number,
  local: Vector3,
  out: Vector3,
  fallbackHeight = 0.9
): Vector3 {
  const gltf = e.modelObject?.gltf;
  const node = gltf?.skeleton?.bones[bone + 1]?.getTransformNode();
  if (node && gltf && !gltf.mesh.isDisposed()) {
    Vector3.TransformCoordinatesToRef(local, node.getWorldMatrix(), out);
    return out;
  }
  return entityPos(e, fallbackHeight, out);
}

/** True once the entity has left the world (despawned, out of scope, disposed). */
export function entityGone(e: Entity): boolean {
  if (!e.transform) return true;
  if (e.objOutOfScope) return true;
  const mesh = e.modelObject?.gltf?.mesh;
  return !!mesh && mesh.isDisposed();
}

/** A moving point: writes into `out` and returns it. */
export type PointSource = (out: Vector3) => Vector3;

export function followEntity(e: Entity, height: number): PointSource {
  return out => entityPos(e, height, out);
}

export function fixedPoint(p: Vector3): PointSource {
  const v = p.clone();
  return out => out.copyFrom(v);
}

export function pointSource(p: Vector3 | PointSource): PointSource {
  return p instanceof Vector3 ? fixedPoint(p) : p;
}

/* --------------------------------------------------------------- textures */

/** `Effect/…` or `Skill/…` file under Data/, shared through the cache. */
export function effectTexture(scene: Scene, file: string): Promise<Texture> {
  return loadEffectTexture(scene, file);
}

/* -------------------------------------------------------------- materials */

const materials = new Map<Scene, Map<string, StandardMaterial>>();

function colourKey(c: RGB): string {
  return `${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0}`;
}

/** MU's two effect blends: `EnableAlphaBlend` (ONE, ONE) and `EnableAlphaBlendMinus` (ZERO, ONE_MINUS_SRC_COLOR). */
export type EffectBlend = 'add' | 'subtract';

/**
 * The additive blend the cards and skill meshes use: `(SRC_ALPHA, ONE)`.
 * The original's `EnableAlphaBlend` is `(ONE, ONE)` and it fades an effect
 * by scaling `glColor3fv(Light × Alpha)` — the colour toward black. Under
 * `(ONE, ONE)` Babylon's `mesh.visibility` never reaches the framebuffer
 * (the alpha is simply dropped), so every fade was a no-op and `sprite`
 * shrank its card instead. `(SRC_ALPHA, ONE)` with an opaque sheet is the
 * same maths — `src × visibility + dst` — and lets `visibility` be the
 * original's `Alpha` .
 */
const ADDITIVE_ALPHA_MODE = Constants.ALPHA_ADD;

/**
 * Unlit material tinted `colour` (the original's `glColor3fv(Light)` on an
 * `EnableAlphaBlend` quad). Cached per (texture, colour, blend). JPG effect
 * sheets are black where they are transparent, and with (ONE, ONE) black adds
 * nothing — so no alpha channel is needed. The sheet rides in `diffuseTexture`
 * with the tint in `emissiveColor`: the Standard fragment is
 * `clamp(diffuseBase·diffuseColor + emissiveColor + ambient) × diffuseTexel`,
 * and with lighting off `diffuseBase` is 0, so the texel is *multiplied* by
 * the tint like `glColor3fv`. (The sheet as `emissiveTexture` is *added* to
 * `emissiveColor` instead — the tint filled the card's black and every flash
 * was a solid tinted square, 2026-08-30.) `subtract` is
 * `EnableAlphaBlendMinus` (ZzzOpenglUtil.cpp:444, `dest × (1 − src)`,
 * Babylon's ALPHA_SUBTRACT): the dark trail a levelled character's sword
 * leaves in `RenderBlurs`.
 */
export function additiveMaterial(
  scene: Scene,
  texture: string | Texture,
  colour: RGB,
  blend: EffectBlend = 'add'
): StandardMaterial {
  let byKey = materials.get(scene);
  if (!byKey) {
    byKey = new Map();
    materials.set(scene, byKey);
  }
  const texKey = typeof texture === 'string' ? texture : `#${texture.uniqueId}`;
  const key = `${texKey}|${colourKey(colour)}|${blend}`;
  let m = byKey.get(key);
  if (m) return m;

  const mat = new StandardMaterial(`fx:${key}`, scene);
  mat.diffuseColor.set(0, 0, 0);
  mat.specularColor.set(0, 0, 0);
  mat.ambientColor.set(0, 0, 0);
  mat.emissiveColor.set(colour[0], colour[1], colour[2]);
  mat.disableLighting = true;
  mat.alphaMode = blend === 'subtract' ? Constants.ALPHA_SUBTRACT : ADDITIVE_ALPHA_MODE;
  mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  mat.fogEnabled = false;

  if (typeof texture === 'string') {
    void effectTexture(scene, texture).then(tex => {
      if (materials.get(scene)?.get(key) !== mat) return; // pools were reset meanwhile
      mat.diffuseTexture = tex;
    });
  } else {
    // A texture somebody else owns (a skill model's, from the GLB cache):
    // referenced, never disposed — `disposePools` drops the material only.
    mat.diffuseTexture = texture;
  }

  byKey.set(key, mat);
  m = mat;
  return m;
}

/* ---------------------------------------------------------------- cards */

/** A pooled quad; unit-sized, so `scaling` is the edge in tiles. */
export type Card = Mesh;

/**
 * A sheet drawn one cell at a time — the original's
 * `RenderSprite(…, Frame % 4 * 0.25, Frame / 4 * 0.25, 0.25, 0.25)` on
 * BITMAP_EXPLOTION. `w`/`h` are the cell size in texels, `count` how many
 * cells hold frames (Explotion01 is 4×4 but only the first 10 are drawn — the
 * rest of the sheet is solid white, which is what a card showing the whole
 * sheet used to look like).
 */
export interface SheetCells {
  w: number;
  h: number;
  count: number;
}

/** The original's `+ 0.005f` / `- 0.01f` UV guard against the next cell bleeding in. */
const CELL_INSET = 0.005;
const WHOLE_SHEET_UVS = [0, 0, 1, 0, 1, 1, 0, 1];

const cardPool = new Map<Scene, Card[]>();

let cardSeq = 0;

export function acquireCard(scene: Scene, material: StandardMaterial, billboard = true): Card {
  let pool = cardPool.get(scene);
  if (!pool) {
    pool = [];
    cardPool.set(scene, pool);
  }
  let card = pool.pop();
  if (!card) {
    card = CreatePlane(`fxCard${cardSeq++}`, { size: 1, updatable: true }, scene);
    card.isPickable = false;
    card.alwaysSelectAsActiveMesh = true;
    card.receiveShadows = false;
    card.doNotSyncBoundingInfo = true;
    // Never a glow-layer contributor — additive already is the glow.
    (scene as TestScene).look?.glow.addExcludedMesh(card);
  }
  card.material = material;
  card.billboardMode = billboard ? Mesh.BILLBOARDMODE_ALL : Mesh.BILLBOARDMODE_NONE;
  card.rotationQuaternion = null;
  card.rotation.setAll(0);
  card.scaling.setAll(1);
  card.visibility = 1;
  card.setEnabled(true);
  return card;
}

export function releaseCard(scene: Scene, card: Card): void {
  card.setEnabled(false);
  card.parent = null;
  if (card.metadata?.cellUvs) {
    card.updateVerticesData(VertexBuffer.UVKind, WHOLE_SHEET_UVS);
    card.metadata.cellUvs = false;
  }
  cardPool.get(scene)?.push(card);
}

/**
 * Point a card's UVs at cell `frame` of its material's sheet — row-major from
 * the top-left, like the original's `Frame % 4`, `Frame / 4`. The columns
 * come from the loaded sheet's size, so this returns false (and leaves the
 * card alone) until the texture is ready; call it again next frame.
 */
export function setCardCell(card: Card, cells: SheetCells, frame: number): boolean {
  const tex = (card.material as StandardMaterial | null)?.diffuseTexture;
  if (!tex?.isReady()) return false;
  const size = tex.getBaseSize();
  if (!size.width || !size.height) return false;
  const cols = Math.max(1, Math.floor(size.width / cells.w));
  const rows = Math.max(1, Math.floor(size.height / cells.h));
  const col = frame % cols;
  const row = Math.floor(frame / cols);
  const u0 = col / cols + CELL_INSET;
  const u1 = (col + 1) / cols - CELL_INSET;
  // Effect textures load with invertY, so v = 0 is the sheet's bottom edge.
  const v1 = 1 - row / rows - CELL_INSET;
  const v0 = 1 - (row + 1) / rows + CELL_INSET;
  card.updateVerticesData(VertexBuffer.UVKind, [u0, v0, u1, v0, u1, v1, u0, v1]);
  card.metadata ??= {};
  card.metadata.cellUvs = true;
  return true;
}

/* -------------------------------------------------------------- particles */

export interface ParticleRecipe {
  texture: string;
  colour: RGB;
  /** Colour the particle dies to (default: same hue, faded). */
  colourEnd?: RGB;
  /** Card edge in tiles. */
  size: number;
  sizeJitter?: number;
  /** Seconds. */
  life: number;
  lifeJitter?: number;
  /** Emit box half extents around the emitter (tiles). */
  box?: readonly [number, number, number];
  /** Direction range. */
  dir1?: readonly [number, number, number];
  dir2?: readonly [number, number, number];
  /** Tiles per second. */
  power?: number;
  powerJitter?: number;
  /** Tiles per second squared, +up. */
  gravity?: number;
  /** Radians per second, ± */
  spin?: number;
  /** Animation-sheet cells when the texture is a strip. */
  cells?: { w: number; h: number; count: number };
  /** Size factor at death (1 = constant). */
  endScale?: number;
  capacity?: number;
  /** Additive (MU default) or standard alpha (smoke). */
  blend?: 'add' | 'alpha';
}

const systems = new Map<Scene, Map<string, ParticleSystem>>();
/** Recipe identity → system, so a table row's burst never re-stringifies its recipe. */
const systemsByRecipe = new Map<Scene, WeakMap<ParticleRecipe, ParticleSystem>>();

/**
 * Where the next manually emitted particles start. `emitBurst` / `Emitter`
 * used to write `ps.emitter` and bump `manualEmitCount`: two spawns of one
 * recipe in the same frame (a hit's sparks and its blood, three arrows'
 * trails, every `scatter(every = 0)`) left only the last position, and the
 * whole frame's particles came out of it . The emissions
 * of a frame now queue their positions and `startPositionFunction` hands
 * them out in order as the system flushes `manualEmitCount`.
 */
interface PendingEmit {
  x: number;
  y: number;
  z: number;
  n: number;
}
interface EmitQueue {
  q: PendingEmit[];
  head: number;
  len: number;
}
const emitQueues = new WeakMap<ParticleSystem, EmitQueue>();

function queueEmit(ps: ParticleSystem, at: Vector3, n: number): void {
  let s = emitQueues.get(ps);
  if (!s) {
    s = { q: [], head: 0, len: 0 };
    emitQueues.set(ps, s);
  }
  // Babylon zeroes `manualEmitCount` when it flushes; nothing pending means
  // last frame's queue is spent (or was dropped at capacity) — start over.
  if (ps.manualEmitCount <= 0) {
    s.head = 0;
    s.len = 0;
  }
  let p = s.q[s.len];
  if (!p) {
    p = { x: 0, y: 0, z: 0, n: 0 };
    s.q.push(p);
  }
  p.x = at.x;
  p.y = at.y;
  p.z = at.z;
  p.n = n;
  s.len++;
  (ps.emitter as Vector3).copyFrom(at);
  ps.manualEmitCount = Math.max(ps.manualEmitCount, 0) + n;
}

function nextStartPosition(ps: ParticleSystem, out: Vector3): void {
  const s = emitQueues.get(ps);
  const min = ps.minEmitBox;
  const max = ps.maxEmitBox;
  let x: number;
  let y: number;
  let z: number;
  if (s && s.head < s.len) {
    const p = s.q[s.head];
    if (--p.n <= 0) s.head++;
    x = p.x;
    y = p.y;
    z = p.z;
  } else {
    const e = ps.emitter as Vector3;
    x = e.x;
    y = e.y;
    z = e.z;
  }
  out.set(
    x + lerp(min.x, max.x, Math.random()),
    y + lerp(min.y, max.y, Math.random()),
    z + lerp(min.z, max.z, Math.random())
  );
}

export function particleSystemFor(scene: Scene, r: ParticleRecipe): ParticleSystem {
  let byRecipe = systemsByRecipe.get(scene);
  if (!byRecipe) {
    byRecipe = new WeakMap();
    systemsByRecipe.set(scene, byRecipe);
  }
  let ps = byRecipe.get(r);
  if (ps) return ps;

  let map = systems.get(scene);
  if (!map) {
    map = new Map();
    systems.set(scene, map);
  }
  // An inline `{ ...recipe }` spread is a new identity with an old shape.
  const k = JSON.stringify(r);
  ps = map.get(k);
  if (ps) {
    byRecipe.set(r, ps);
    return ps;
  }

  ps = new ParticleSystem(`fx:${r.texture}`, r.capacity ?? 256, scene);
  ps.emitter = Vector3.Zero();
  ps.isLocal = false;
  ps.forceDepthWrite = false;
  // BLENDMODE_ADD is (SRC_ALPHA, ONE): the colour × alpha is added, so the
  // gradients below fade a sprite toward black under it.
  ps.blendMode =
    r.blend === 'alpha' ? ParticleSystem.BLENDMODE_STANDARD : ParticleSystem.BLENDMODE_ADD;

  // The fade: an additive sprite dies by its colour going to black (the
  // original's `Light × LifeTime / n`), an alpha one by its alpha. The
  // start / mid / end keys carry the same 1 → 0.8 → 0 curve either way.
  const c = r.colour;
  const e = r.colourEnd ?? c;
  const key = (rgb: RGB, k: number): Color4 =>
    r.blend === 'alpha'
      ? new Color4(rgb[0], rgb[1], rgb[2], k)
      : new Color4(rgb[0] * k, rgb[1] * k, rgb[2] * k, 1);
  const start = key(c, 1);
  ps.color1 = start;
  ps.color2 = start.scale(0.85);
  ps.colorDead = key(e, 0);
  ps.addColorGradient(0, start);
  ps.addColorGradient(0.6, key(e, 0.8));
  ps.addColorGradient(1, key(e, 0));

  const sj = r.sizeJitter ?? 0.25;
  ps.minSize = r.size * (1 - sj);
  ps.maxSize = r.size * (1 + sj);
  if (r.endScale !== undefined) {
    // A size gradient *replaces* minSize/maxSize (thinParticleSystem
    // `_createParticle`: `particle.size = gradient.getFactor()`), so the
    // keys must carry the real size range — `(0, 1) → (1, endScale)` was born
    // one tile wide and grew to `endScale` tiles.
    ps.addSizeGradient(0, ps.minSize, ps.maxSize);
    ps.addSizeGradient(1, ps.minSize * r.endScale, ps.maxSize * r.endScale);
  }
  const lj = r.lifeJitter ?? 0.3;
  ps.minLifeTime = r.life * (1 - lj);
  ps.maxLifeTime = r.life;

  const b = r.box ?? [0.05, 0.05, 0.05];
  ps.minEmitBox = new Vector3(-b[0], -b[1], -b[2]);
  ps.maxEmitBox = new Vector3(b[0], b[1], b[2]);
  const d1 = r.dir1 ?? [-1, -1, -1];
  const d2 = r.dir2 ?? [1, 1, 1];
  ps.direction1 = new Vector3(d1[0], d1[1], d1[2]);
  ps.direction2 = new Vector3(d2[0], d2[1], d2[2]);
  const p = r.power ?? 1;
  const pj = r.powerJitter ?? 0.4;
  ps.minEmitPower = p * (1 - pj);
  ps.maxEmitPower = p;
  ps.gravity = new Vector3(0, r.gravity ?? 0, 0);
  const spin = r.spin ?? 0;
  ps.minAngularSpeed = -spin;
  ps.maxAngularSpeed = spin;
  ps.minInitialRotation = 0;
  ps.maxInitialRotation = Math.PI * 2;

  if (r.cells) {
    ps.isAnimationSheetEnabled = true;
    ps.spriteCellWidth = r.cells.w;
    ps.spriteCellHeight = r.cells.h;
    ps.startSpriteCellID = 0;
    ps.endSpriteCellID = r.cells.count - 1;
    ps.spriteCellLoop = true;
    ps.spriteRandomStartCell = true;
  }

  ps.emitRate = 0;
  ps.manualEmitCount = 0;

  const created = ps;
  created.startPositionFunction = (_world, position) => nextStartPosition(created, position);
  void effectTexture(scene, r.texture).then(tex => {
    if (systems.get(scene)?.get(k) === created) created.particleTexture = tex;
  });

  ps.start();
  map.set(k, ps);
  byRecipe.set(r, ps);
  return ps;
}

/** One burst of `count` particles at `at`. */
export function emitBurst(scene: Scene, r: ParticleRecipe, at: Vector3, count: number): void {
  queueEmit(particleSystemFor(scene, r), at, count);
}

/**
 * A continuous emitter that follows a moving point for as long as the
 * caller drives it. Shares the recipe's system, so several trails of one
 * kind (three arrows, a volley) cost one draw.
 */
export class Emitter {
  #acc = 0;
  readonly #ps: ParticleSystem;
  constructor(scene: Scene, r: ParticleRecipe, readonly rate: number) {
    this.#ps = particleSystemFor(scene, r);
  }
  /** Emit `rate` particles per second at `at`; call every frame. */
  tick(at: Vector3, dt: number, rate = this.rate): void {
    this.#acc += rate * dt;
    const n = this.#acc | 0;
    if (n <= 0) return;
    this.#acc -= n;
    queueEmit(this.#ps, at, n);
  }
}

/* ------------------------------------------------------------------ clock */

/**
 * The effects clock: seconds of `effects.update` so far. Everything that
 * sequences a skill — a step after a delay, a point flying along the facing,
 * a ribbon spiralling up — reads this, never `performance.now()` or
 * `setTimeout`: it stops when the game does, and `effects.reset()` cancels
 * every pending step so a warp or a death mid-cast leaves nothing to land
 * on the next map .
 */
let clock = 0;

interface Timer extends LiveEffect {
  due: number;
  fn: () => void;
}

const timers = new LiveList();

/** Seconds on the effects clock. */
export function fxNow(): number {
  return clock;
}

/** Run `fn` once `seconds` of effects time have passed. `stop()` cancels it. */
export function delay(seconds: number, fn: () => void): EffectHandle {
  const timer: Timer = {
    due: clock + seconds,
    fn,
    update() {
      if (clock < this.due) return true;
      this.fn();
      return false;
    },
    release() {},
  };
  return timers.push(timer);
}

/** Advance the clock and fire what is due. The facade calls it before the layers step. */
export function stepClock(dt: number): void {
  clock += dt;
  timers.update(dt);
}

/** Drop every pending `delay`. The facade's reset. */
export function clearTimers(): void {
  timers.clear();
}

/* ------------------------------------------------------------------ reset */

/** Dispose every shared pool (materials, cards, particle systems). The facade's reset. */
export function disposePools(): void {
  // Not the textures — a card's comes from loadEffectTexture's cache, a
  // skill mesh's from the GLB cache; both are shared with the map.
  for (const byKey of materials.values()) for (const m of byKey.values()) m.dispose(false, false);
  materials.clear();
  for (const pool of cardPool.values()) for (const c of pool) c.dispose(false, false);
  cardPool.clear();
  for (const map of systems.values()) for (const ps of map.values()) ps.dispose(false);
  systems.clear();
  systemsByRecipe.clear();
}

/* ------------------------------------------------------------------ misc */

export const tmpA = new Vector3();
export const tmpB = new Vector3();
export const tmpC = new Vector3();

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** 1 → 0 over the last `tail` fraction of a 0…1 progress. */
export function fadeOut(progress: number, tail = 0.35): number {
  return clamp01((1 - progress) / tail);
}

/** Deterministic 0…1 noise per seed — jitter without `Math.random` churn. */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function scaleRGB(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}
