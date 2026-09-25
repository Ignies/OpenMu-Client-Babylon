/**
 * Homing - short streaks that fly in from a sphere and home on a point, each
 * stamping a card on that point every tick: the original's
 * `CreateJoint(BITMAP_JOINT_HEALING, sub 15 / 16)` shower around the Summoner
 * curse models (MoveHandlers.cpp:2317-2336). Each joint starts `radius` out on
 * the upper half sphere aimed at the centre, gains `accel` of speed a tick
 * (`Velocity += 4`), turns on the centre (`MoveHumming`, so it stays on its
 * ray), loses light by `decay` a tick and draws a BITMAP_SHINY+1 on the centre
 * every tick of its life (ZzzEffectJoint.cpp:3605-3629).
 *
 * A cast starts six a tick, so the streaks and their stamps are drawn as two
 * batched meshes per spawn (vertex colours, one material per sheet and blend
 * from this entry's cache) instead of a ribbon mesh per joint.
 *
 * Driven by: `effects.spawn('homing', ...)` from `common/skillVisuals.ts`. Read by: nobody.
 */
import {
  Constants,
  Material,
  Mesh,
  StandardMaterial,
  Vector3,
  VertexBuffer,
  VertexData,
  type Scene,
  type Texture,
} from '../libs/babylon/exports';
import type { TestScene } from '../scenes/testScene';
import { clampAlpha } from './clampAlpha';
import {
  EFFECT_RENDERING_GROUP,
  LiveList,
  TICK,
  darkCardGain,
  effectTexture,
  keepDepthForEffects,
  lightCardGain,
  luma,
  type EffectBlend,
  type PointSource,
  type RGB,
} from './core';
import { addEffectGlow, releaseEffectGlow } from './glow';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Most streaks one spawn keeps; the Summoner curses peak at 6 a tick x 10 ticks. */
const MAX_STREAKS = 96;

// ---- 2. state + readers ----------------------------------------------------

export interface HomingOptions {
  /** The point the streaks home on and the stamps sit on. */
  centre: PointSource;
  /** Seconds new streaks keep starting. */
  seconds: number;
  /** Streaks started each tick. */
  perTick: number;
  /** Start distance from the centre, tiles. */
  radius: number;
  /** Speed gained each tick, tiles per tick. */
  accel: number;
  /** A streak's life, ticks. */
  life: number;
  /** Tail slots behind the head (the joint's `MaxTails`): the streak is the path of the last `tails` ticks. */
  tails: number;
  /** Streak width, tiles. */
  width: number;
  texture: string;
  colour: RGB;
  /** Light multiplied by this every tick. */
  decay?: number;
  /** `subtract` is RENDER_TYPE_ALPHA_BLEND_MINUS (sub 16): black streaks and stamps with the sheets as coverage. */
  blend?: EffectBlend;
  /** The card each live streak stamps on the centre: sheet, edge in tiles at Scale 1, and the Scale roll. */
  stamp?: { texture: string; w: number; h: number; scale: readonly [number, number] };
  /** Stops new streaks early (the target left). */
  until?: () => boolean;
}

interface Streak {
  x: number;
  y: number;
  z: number;
  age: number;
  roll: number;
  scale: number;
}

interface Batch {
  mesh: Mesh;
  positions: Float32Array;
  colors: Float32Array;
}

const live = new LiveList();
const materials = new Map<string, StandardMaterial>();

/** How many homing showers are running (debug). */
export function homingCount(): number {
  return live.size;
}

const centre = new Vector3();
const right = new Vector3();
const up = new Vector3();
const axis = new Vector3();
const side = new Vector3();
const toCam = new Vector3();

/**
 * One material per sheet, blend and gain. Additive: the sheet x the vertex colour under (SRC_ALPHA, ONE).
 * Dark: black, the sheet's luminance x the vertex alpha as coverage (the dark cards' rule, core.ts).
 */
function materialFor(scene: Scene, texture: string, dark: boolean): StandardMaterial {
  const gain = dark ? 1 : lightCardGain(scene);
  const key = `${texture}|${dark ? 'd' : 'a'}|${gain.toFixed(3)}`;
  const known = materials.get(key);
  if (known) return known;

  const mat = new StandardMaterial(`fxHoming:${key}`, scene);
  mat.diffuseColor.set(0, 0, 0);
  mat.specularColor.set(0, 0, 0);
  mat.ambientColor.set(0, 0, 0);
  mat.emissiveColor.set(dark ? 0 : gain, dark ? 0 : gain, dark ? 0 : gain);
  mat.disableLighting = true;
  mat.alphaMode = dark ? Constants.ALPHA_COMBINE : Constants.ALPHA_ADD;
  mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  mat.fogEnabled = false;
  if (dark) clampAlpha(mat);
  let own: Texture | null = null;
  let dead = false;
  void effectTexture(scene, texture).then(tex => {
    if (dead) return;
    if (dark) {
      // A clone, so the shared sheet's other users keep their own alpha.
      own = tex.clone();
      own.getAlphaFromRGB = true;
      mat.opacityTexture = own;
    } else {
      mat.diffuseTexture = tex;
    }
  });
  mat.onDisposeObservable.addOnce(() => {
    dead = true;
    own?.dispose();
  });
  materials.set(key, mat);
  return mat;
}

function makeBatch(scene: Scene, quads: number, material: StandardMaterial, dark: boolean, u0: number, u1: number): Batch {
  const positions = new Float32Array(quads * 12);
  const colors = new Float32Array(quads * 16);
  const uvs = new Float32Array(quads * 8);
  const indices = new Uint32Array(quads * 6);
  for (let q = 0; q < quads; q++) {
    uvs.set([u0, 0, u1, 0, u1, 1, u0, 1], q * 8);
    const b = q * 4;
    indices.set([b, b + 1, b + 2, b, b + 2, b + 3], q * 6);
  }
  const mesh = new Mesh('fxHoming', scene);
  const data = new VertexData();
  data.positions = positions;
  data.colors = colors;
  data.uvs = uvs;
  data.indices = indices;
  data.applyToMesh(mesh, true);
  mesh.material = material;
  mesh.useVertexColors = true;
  mesh.hasVertexAlpha = dark;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.doNotSyncBoundingInfo = true;
  mesh.renderingGroupId = EFFECT_RENDERING_GROUP;
  mesh.metadata = { brightMesh: !dark };
  keepDepthForEffects(scene);
  (scene as TestScene).look?.glow.addExcludedMesh(mesh);
  if (!dark) addEffectGlow(scene, mesh);
  return { mesh, positions, colors };
}

function putColour(b: Batch, q: number, c: RGB, k: number, dark: boolean, cover: number): void {
  const o = q * 16;
  const r = dark ? 0 : c[0] * k;
  const g = dark ? 0 : c[1] * k;
  const bl = dark ? 0 : c[2] * k;
  const a = dark ? Math.min(1, luma(c) * k * cover) : 1;
  for (let v = 0; v < 4; v++) {
    b.colors[o + v * 4] = r;
    b.colors[o + v * 4 + 1] = g;
    b.colors[o + v * 4 + 2] = bl;
    b.colors[o + v * 4 + 3] = a;
  }
}

function putQuad(b: Batch, q: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, sx: number, sy: number, sz: number): void {
  // Corners: a - side, a + side, b + side, b - side (U runs a -> b).
  const p = b.positions;
  const o = q * 12;
  p[o] = ax - sx;
  p[o + 1] = ay - sy;
  p[o + 2] = az - sz;
  p[o + 3] = bx - sx;
  p[o + 4] = by - sy;
  p[o + 5] = bz - sz;
  p[o + 6] = bx + sx;
  p[o + 7] = by + sy;
  p[o + 8] = bz + sz;
  p[o + 9] = ax + sx;
  p[o + 10] = ay + sy;
  p[o + 11] = az + sz;
}

/** Whether a batch's sheet has loaded; before that it would draw as solid quads of its tint. */
function sheetIn(b: Batch, dark: boolean): boolean {
  const m = b.mesh.material as StandardMaterial | null;
  return !!(dark ? m?.opacityTexture : m?.diffuseTexture);
}

function clearQuads(b: Batch, from: number, to: number): void {
  b.positions.fill(0, from * 12, to * 12);
  b.colors.fill(0, from * 16, to * 16);
}

function spawn(scene: Scene, _at: Vector3, opts: HomingOptions): EffectHandle {
  const dark = opts.blend === 'subtract';
  const cover = dark ? darkCardGain(scene) : 1;
  const decay = opts.decay ?? 1;
  const cap = Math.min(MAX_STREAKS, Math.ceil(opts.perTick) * (opts.life + 1));
  // U runs tail (0) to head (1), the joint sheet's `(NumTails - j) / (MaxTails - 1)`.
  const streaks = makeBatch(scene, cap, materialFor(scene, opts.texture, dark), dark, 0, 1);
  const stamps = opts.stamp ? makeBatch(scene, cap, materialFor(scene, opts.stamp.texture, dark), dark, 0, 1) : null;
  const pool: Streak[] = [];
  for (let i = 0; i < cap; i++) pool.push({ x: 0, y: 0, z: 0, age: -1, roll: 0, scale: 1 });
  const lifeSeconds = opts.life * TICK;
  const distAt = (n: number): number => Math.max(0, opts.radius - (opts.accel * n * (n + 1)) / 2);

  let t = 0;
  let tickAcc = 0;
  let emitting = true;

  return live.push({
    update(dt) {
      t += dt;
      if (emitting && (t >= opts.seconds || opts.until?.())) emitting = false;
      tickAcc += dt;
      let ticks = 0;
      while (tickAcc >= TICK) {
        tickAcc -= TICK;
        ticks++;
      }
      let alive = 0;
      for (const s of pool) {
        if (s.age < 0) continue;
        s.age += dt;
        if (s.age >= lifeSeconds) s.age = -1;
        else alive++;
      }
      if (emitting) {
        let free = 0;
        for (let k = 0; k < ticks * opts.perTick; k++) {
          while (free < cap && pool[free].age >= 0) free++;
          if (free >= cap) break;
          const s = pool[free];
          const yaw = Math.random() * Math.PI * 2;
          const pitch = Math.random() * (Math.PI / 2);
          s.x = Math.cos(pitch) * Math.sin(yaw);
          s.y = Math.sin(pitch);
          s.z = Math.cos(pitch) * Math.cos(yaw);
          s.age = 0;
          s.scale = 0;
          alive++;
        }
      }
      if (!emitting && alive === 0) return false;

      const cam = scene.activeCamera;
      // Until its sheet is in, a batch would draw as solid quads of its tint.
      streaks.mesh.isVisible = sheetIn(streaks, dark);
      if (stamps) stamps.mesh.isVisible = sheetIn(stamps, dark);
      if (!cam) return true;
      const view = cam.getViewMatrix().m;
      right.set(view[0], view[4], view[8]);
      up.set(view[1], view[5], view[9]);
      const camPos = cam.globalPosition;
      opts.centre(centre);
      const half = opts.width / 2;

      let q = 0;
      for (const s of pool) {
        if (s.age < 0) continue;
        const n = s.age / TICK;
        const head = distAt(n);
        const tail = distAt(Math.max(0, n - opts.tails));
        const ax = centre.x + s.x * tail;
        const ay = centre.y + s.y * tail;
        const az = centre.z + s.z * tail;
        const bx = centre.x + s.x * head;
        const by = centre.y + s.y * head;
        const bz = centre.z + s.z * head;
        axis.set(s.x, s.y, s.z);
        toCam.set(camPos.x - bx, camPos.y - by, camPos.z - bz);
        Vector3.CrossToRef(axis, toCam, side);
        const len = side.length() || 1;
        side.scaleInPlace(half / len);
        putQuad(streaks, q, ax, ay, az, bx, by, bz, side.x, side.y, side.z);
        const k = decay ** n;
        putColour(streaks, q, opts.colour, k, dark, cover);

        if (stamps && opts.stamp) {
          // A new roll and Scale every tick, like the per-tick CreateSprite.
          if (ticks > 0 || s.scale === 0) {
            s.roll = Math.random() * Math.PI * 2;
            s.scale = opts.stamp.scale[0] + Math.random() * (opts.stamp.scale[1] - opts.stamp.scale[0]);
          }
          const hw = (opts.stamp.w * s.scale) / 2;
          const hh = (opts.stamp.h * s.scale) / 2;
          const c = Math.cos(s.roll);
          const sn = Math.sin(s.roll);
          // The card's own axes: right and up turned by the roll; its long side runs along `v`.
          const vx = (-right.x * sn + up.x * c) * hh;
          const vy = (-right.y * sn + up.y * c) * hh;
          const vz = (-right.z * sn + up.z * c) * hh;
          const wx = (right.x * c + up.x * sn) * hw;
          const wy = (right.y * c + up.y * sn) * hw;
          const wz = (right.z * c + up.z * sn) * hw;
          putQuad(stamps, q, centre.x - vx, centre.y - vy, centre.z - vz, centre.x + vx, centre.y + vy, centre.z + vz, wx, wy, wz);
          putColour(stamps, q, opts.colour, k, dark, cover);
        }
        q++;
      }
      clearQuads(streaks, q, cap);
      streaks.mesh.updateVerticesData(VertexBuffer.PositionKind, streaks.positions);
      streaks.mesh.updateVerticesData(VertexBuffer.ColorKind, streaks.colors);
      if (stamps) {
        clearQuads(stamps, q, cap);
        stamps.mesh.updateVerticesData(VertexBuffer.PositionKind, stamps.positions);
        stamps.mesh.updateVerticesData(VertexBuffer.ColorKind, stamps.colors);
      }
      return true;
    },
    release() {
      for (const b of stamps ? [streaks, stamps] : [streaks]) {
        releaseEffectGlow(b.mesh);
        (scene as TestScene).look?.glow.removeExcludedMesh(b.mesh);
        b.mesh.dispose(false, false);
      }
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
  for (const m of materials.values()) m.dispose(false, false);
  materials.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const homingLayer: EffectLayer<HomingOptions, 'homing'> = {
  name: 'homing',
  update,
  reset,
  spawn,
};
