/**
 * Path - a textured cross ribbon laid along a path fixed at spawn, revealed
 * point by point: the original's tail joints whose tails are *added* along a
 * computed curve rather than dragged behind a moving head (BITMAP_FLARE_FORCE,
 * ZzzEffectJoint.cpp:6593-6672). Each path point is a tail: a horizontal face
 * along `side` and a vertical one, `width` across (`CreateTail`'s four
 * corners), the sheet running U from the root, and a per-point brightness
 * (`RenderJoints`' per-quad `Luminosity`, :7251).
 *
 * One mesh per spawn with vertex colours for the shade; the material is
 * core.ts's shared additive one. Positions are rewritten only when the
 * revealed count changes.
 *
 * Driven by: `effects.spawn('path', …)`. Read by: nobody.
 */
import { Constants, Mesh, Vector3, VertexBuffer, VertexData, type Scene, type Texture } from '../libs/babylon/exports';
import { Store } from '../store';
import type { TestScene } from '../scenes/testScene';
import { EFFECT_RENDERING_GROUP, LiveList, TICK, WHITE, additiveMaterial, fxNow, keepDepthForEffects, type RGB } from './core';
import { addEffectGlow, releaseEffectGlow } from './glow';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** A FLARE_FORCE joint lives 20 ticks. */
const DEFAULT_SECONDS = 0.8;

/** Tail width in tiles when none is given: the helices' 100 cm. */
const DEFAULT_WIDTH = 1;

// ---- 2. state + readers ----------------------------------------------------

export interface PathOptions {
  /** The path in tiles, from its root (index 0) to its tip. */
  points: readonly Vector3[];
  /** Points drawn `tick` ticks into the growth (1 on the first tick). Default: all of them. */
  reveal?: (tick: number) => number;
  /** Seconds before the growth starts (the helices' `Weapon` countdown); counted in `seconds`. */
  wait?: number;
  seconds?: number;
  /** Tail width in tiles (the joint's `Scale`). */
  width?: number;
  /** The horizontal face's across axis, flat and unit (the joint's `Angle` X axis). Default +x. */
  side?: Vector3;
  texture: string;
  colour?: RGB;
  /** Sheet U per point from the root. */
  uPerPoint?: number;
  /** U scroll in sheet lengths/s, off the effects clock (the shared sheet's `WorldTime % 1000`). */
  scroll?: number;
  /**
   * Brightness of point `i` (0 = the root), may pass 1: each channel of `colour x shade` is clamped
   * to 1 before the sheet multiplies it, as `glColor` is.
   */
  shade?: (i: number) => number;
  /** Visibility over life, 0…1 progress in. */
  life?: (p: number) => number;
}

const live = new LiveList();

/** How many paths are drawn (debug). */
export function pathCount(): number {
  return live.size;
}

const X = new Vector3(1, 0, 0);

function writePositions(out: Float32Array, points: readonly Vector3[], shown: number, side: Vector3, half: number): void {
  const last = Math.max(0, shown - 1);
  for (let i = 0; i < points.length; i++) {
    const p = points[Math.min(i, last)];
    const o = i * 12;
    out[o] = p.x - side.x * half;
    out[o + 1] = p.y;
    out[o + 2] = p.z - side.z * half;
    out[o + 3] = p.x + side.x * half;
    out[o + 4] = p.y;
    out[o + 5] = p.z + side.z * half;
    out[o + 6] = p.x;
    out[o + 7] = p.y - half;
    out[o + 8] = p.z;
    out[o + 9] = p.x;
    out[o + 10] = p.y + half;
    out[o + 11] = p.z;
  }
}

function spawn(scene: Scene, _at: Vector3, opts: PathOptions): EffectHandle {
  const world = Store.world;
  const points = opts.points;
  const n = points.length;
  const seconds = opts.seconds ?? DEFAULT_SECONDS;
  const wait = opts.wait ?? 0;
  const half = (opts.width ?? DEFAULT_WIDTH) / 2;
  const side = opts.side ?? X;
  const du = opts.uPerPoint ?? 1 / Math.max(1, n - 1);
  // The tint rides in the vertex colours, so every path of a sheet shares one material.
  const material = additiveMaterial(scene, opts.texture, WHITE);
  const tint = opts.colour ?? WHITE;

  const positions = new Float32Array(n * 12);
  const uvs = new Float32Array(n * 8);
  const colours = new Float32Array(n * 16);
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = i * du;
    uvs.set([u, 0, u, 1, u, 0, u, 1], i * 8);
    const s = opts.shade ? opts.shade(i) : 1;
    const cr = Math.min(1, tint[0] * s);
    const cg = Math.min(1, tint[1] * s);
    const cb = Math.min(1, tint[2] * s);
    for (let k = 0; k < 4; k++) colours.set([cr, cg, cb, 1], i * 16 + k * 4);
    if (i < n - 1) {
      const a = i * 4;
      const b = a + 4;
      indices.push(a, a + 1, b + 1, a, b + 1, b, a + 2, a + 3, b + 3, a + 2, b + 3, b + 2);
    }
  }
  writePositions(positions, points, 0, side, half);

  const mesh = new Mesh('fxPath', scene);
  const data = new VertexData();
  data.positions = positions;
  data.uvs = uvs;
  data.colors = colours;
  data.indices = indices;
  data.applyToMesh(mesh, true);
  if (world) mesh.parent = world.mapParent;
  mesh.material = material;
  mesh.useVertexColors = true;
  mesh.hasVertexAlpha = false;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.renderingGroupId = EFFECT_RENDERING_GROUP;
  mesh.metadata = { brightMesh: true };
  keepDepthForEffects(scene);
  (scene as TestScene).look?.glow.addExcludedMesh(mesh);
  addEffectGlow(scene, mesh);

  let t = 0;
  let shown = 0;
  return live.push({
    update(dt) {
      t += dt;
      const p = t / seconds;
      if (p >= 1) return false;
      const grown = t - wait;
      const want = grown < 0 ? 0 : Math.min(n, opts.reveal ? opts.reveal(Math.floor(grown / TICK) + 1) : n);
      if (want !== shown) {
        shown = want;
        writePositions(positions, points, shown, side, half);
        mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
      }
      // Held unseen until the sheet is in: without it the ribbon is a solid band.
      mesh.isVisible = shown >= 2 && !!material.diffuseTexture;
      mesh.visibility = opts.life ? opts.life(p) : 1;
      const sheet = material.diffuseTexture as Texture | null;
      if (sheet && opts.scroll) {
        sheet.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
        sheet.uOffset = -((fxNow() * opts.scroll) % 1);
      }
      return true;
    },
    release() {
      releaseEffectGlow(mesh);
      (scene as TestScene).look?.glow.removeExcludedMesh(mesh);
      // Never the material: it is core.ts's shared cache.
      mesh.dispose(false, false);
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const pathLayer: EffectLayer<PathOptions, 'path'> = {
  name: 'path',
  update,
  reset,
  spawn,
};
