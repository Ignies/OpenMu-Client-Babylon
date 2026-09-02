/**
 * Joint — a glowing ribbon that jitters while it lives: a lightning bolt, a
 * chain of energy, a spirit tether, a streamer. The original's
 * `CreateJoint(BITMAP_JOINT_*, from, to, …)` (ZzzEffectJoint.cpp) comes in
 * two shapes and both live here:
 *
 *  - **bolt**: a strip of `segments` points between two ends, re-pointed
 *    every tick with noise (JOINT_THUNDER, JOINT_HEALING, the beams);
 *  - **trail**: a *head* that moves (`Velocity` per tick along `Angle`, or
 *    pinned to a bone) and drags its last `MaxTails` positions behind it
 *    (JOINT_SPIRIT streamers, the FLASH ribbon dropping from the sky, the
 *    five MODEL_SPEARSKILL ribbons that orbit a Soul Barrier).
 *
 * One `GreasedLine` per joint, additive, in the joint's colour, glow-layer
 * referenced so it blooms like the item crackle. Both ends of a bolt may
 * move, and `forks` grows side branches for Lightning.
 *
 * Driven by: `effects.spawn('joint', …)`; `aura.ts` spawns the persistent
 * orbit ribbons through `spawnJoint`. Read by: nobody.
 */
import {
  Color3,
  Constants,
  CreateGreasedLine,
  GreasedLineMeshMaterialType,
  Vector3,
  type GreasedLineMesh,
  type GreasedLineSimpleMaterial,
  type Scene,
} from '../libs/babylon/exports';
import type { TestScene } from '../scenes/testScene';
import { LiveList, fadeOut, hash, pointSource, type EffectBlend, type PointSource, type RGB } from './core';
import { RGBS } from './recipes';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** A lightning joint lives 10 ticks. */
const DEFAULT_SECONDS = 0.4;

/** Segments per bolt: the C++ joints are 10–16 points. */
const DEFAULT_SEGMENTS = 12;

/** Trail segments when none given: JOINT_SPIRIT's MaxTails 6. */
const DEFAULT_TAILS = 6;

/** Ribbon width in tiles (no size attenuation). */
const DEFAULT_WIDTH = 0.06;

/** Sideways noise per segment as a fraction of the bolt's length. */
const DEFAULT_JITTER = 0.08;

/** How often the noise re-rolls: every 2 ticks. */
const REROLL_SECONDS = 0.08;

/** A trail records its head this often: once a tick, like the original. */
const TAIL_SAMPLE_SECONDS = 0.04;

/** Fork slot count; each fork is a shorter bolt off a random middle segment. */
const MAX_FORKS = 3;

/** Where an inactive line is parked. */
const PARKED_Y = -1000;

// ---- 2. state + readers ----------------------------------------------------

export interface JointOptions {
  /** Bolt: the far end. Omitted = trail mode (`head` or `velocity`). */
  to?: Vector3 | PointSource;
  /** Bolt: move the near end too (default: fixed at `at`). */
  from?: PointSource;
  /** Trail: a driven head (a bone, an orbit); the tail is where it has been. */
  head?: PointSource;
  /** Trail: a free head leaving `at` at this many tiles/s (C++ `Velocity`). */
  velocity?: number;
  /** Trail: the free head's direction (unit-ish; default: +z). */
  heading?: Vector3;
  /** Trail: radians/s the free head's yaw turns (the original's per-tick `Angle` step). */
  turn?: number;
  /** Trail: tiles/s² pulling the free head down. */
  gravity?: number;
  /** Trail: segments kept behind the head (C++ `MaxTails`). */
  maxTails?: number;
  colour?: RGB;
  /** Lifetime; `Infinity` lives until `stop()` / `until` (the original's LT 999999). */
  seconds?: number;
  /** Ribbon width in tiles (C++ `Scale`). */
  width?: number;
  /** Bolt: points between the ends. */
  segments?: number;
  /** Bolt: sideways noise as a fraction of length; 0 = a straight beam. */
  jitter?: number;
  /** Bolt: side branches, 0…3. */
  forks?: number;
  /** Tiles above both points. */
  height?: number;
  /**
   * `add` (default) is `EnableAlphaBlend`; `subtract` is
   * `EnableAlphaBlendMinus` (`dst × (1 − src)`, ZzzOpenglUtil.cpp:444) — the
   * dark ribbons of `RENDER_TYPE_ALPHA_BLEND_MINUS` joints (Evil Spirit's
   * JOINT_SPIRIT sub0, ZzzEffectJoint.cpp:602).
   */
  blend?: EffectBlend;
  /** Ends it early when true (the wearer left, the charge released). */
  until?: () => boolean;
}

const live = new LiveList();

/** How many joints are drawn (debug). */
export function jointCount(): number {
  return live.size;
}

const a = new Vector3();
const b = new Vector3();
const p = new Vector3();
const side = new Vector3();
const up = new Vector3(0, 1, 0);
let seed = 0;

function fillLine(points: number[], from: Vector3, to: Vector3, segments: number, jitter: number, s: number): void {
  to.subtractToRef(from, p);
  const len = p.length() || 1;
  Vector3.CrossToRef(p, up, side);
  side.normalize();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const k = Math.sin(t * Math.PI) * jitter * len;
    const jx = (hash(s + i * 1.37) - 0.5) * 2 * k;
    const jy = (hash(s + i * 2.71) - 0.5) * 2 * k;
    const o = i * 3;
    points[o] = from.x + p.x * t + side.x * jx;
    points[o + 1] = from.y + p.y * t + jy;
    points[o + 2] = from.z + p.z * t + side.z * jx;
  }
}

function park(points: number[]): void {
  for (let i = 0; i < points.length; i += 3) {
    points[i] = 0;
    points[i + 1] = PARKED_Y;
    points[i + 2] = 0;
  }
}

function makeLine(scene: Scene, lines: number[][], colour: RGB, width: number, blend: EffectBlend = 'add'): GreasedLineMesh {
  const mesh = CreateGreasedLine(
    'fxJoint',
    { points: lines, updatable: true },
    {
      color: new Color3(colour[0], colour[1], colour[2]),
      width,
      sizeAttenuation: false,
      materialType: GreasedLineMeshMaterialType.MATERIAL_TYPE_SIMPLE,
    },
    scene
  ) as GreasedLineMesh;
  mesh.isPickable = false;
  mesh.doNotSyncBoundingInfo = true;
  mesh.alwaysSelectAsActiveMesh = true;
  const material = mesh.material as GreasedLineSimpleMaterial | null;
  if (material) {
    material.alpha = 0.99;
    material.alphaMode = blend === 'subtract' ? Constants.ALPHA_SUBTRACT : Constants.ALPHA_ADD;
    material.disableDepthWrite = true;
    material.backFaceCulling = false;
  }
  // A subtractive ribbon darkens what is behind it; blooming it would re-add
  // the light it just took away.
  if (blend !== 'subtract') {
    (scene as TestScene).look?.glow.referenceMeshToUseItsOwnMaterial(mesh);
  }
  return mesh;
}

function disposeLine(scene: Scene, mesh: GreasedLineMesh, lines: number[][]): void {
  for (const l of lines) park(l);
  (scene as TestScene).look?.glow.unReferenceMeshFromUsingItsOwnMaterial(mesh);
  // Never dispose the shared empty-colours texture: itemCrackle.ts documents the trap.
  const m = mesh.material as unknown as { _colorsTexture?: unknown; dispose(): void } | null;
  if (m) {
    m._colorsTexture = null;
    m.dispose();
  }
  mesh.dispose();
}

/** A bolt between two ends (the original shape of this entry). */
function spawnBolt(scene: Scene, at: Vector3, opts: JointOptions): EffectHandle {
  const colour = opts.colour ?? RGBS.arc;
  const seconds = opts.seconds ?? DEFAULT_SECONDS;
  const segments = opts.segments ?? DEFAULT_SEGMENTS;
  const jitter = opts.jitter ?? DEFAULT_JITTER;
  const forks = Math.min(MAX_FORKS, opts.forks ?? 0);
  const height = opts.height ?? 0;
  const near = opts.from ?? pointSource(at);
  const far = pointSource(opts.to ?? at);

  const lines: number[][] = [];
  for (let i = 0; i < 1 + forks; i++) lines.push(new Array<number>((segments + 1) * 3).fill(0));
  const mesh = makeLine(scene, lines, colour, opts.width ?? DEFAULT_WIDTH, opts.blend);
  const material = mesh.material as GreasedLineSimpleMaterial | null;

  let t = 0;
  let sinceRoll = REROLL_SECONDS;
  let s = seed++ * 7.13;
  const forkFrom = new Vector3();
  const forkTo = new Vector3();

  return live.push({
    update(dt) {
      t += dt;
      const prog = t / seconds;
      if (prog >= 1 || opts.until?.()) return false;
      sinceRoll += dt;
      near(a);
      far(b);
      a.y += height;
      b.y += height;
      if (sinceRoll >= REROLL_SECONDS) {
        sinceRoll = 0;
        s += 3.3;
        fillLine(lines[0], a, b, segments, jitter, s);
        for (let f = 1; f <= forks; f++) {
          const at = 0.3 + hash(s + f) * 0.4;
          const o = Math.floor(at * segments) * 3;
          forkFrom.set(lines[0][o], lines[0][o + 1], lines[0][o + 2]);
          const len = Vector3.Distance(a, b) * 0.35;
          forkTo.set(
            forkFrom.x + (hash(s + f * 1.1) - 0.5) * 2 * len,
            forkFrom.y + (hash(s + f * 1.3) - 0.8) * len,
            forkFrom.z + (hash(s + f * 1.7) - 0.5) * 2 * len
          );
          fillLine(lines[f], forkFrom, forkTo, segments, jitter * 1.5, s + f * 11);
        }
        mesh.setPoints(lines);
      }
      if (material) material.visibility = fadeOut(prog, 0.3) * (0.6 + 0.4 * hash(t * 97));
      return true;
    },
    release() {
      disposeLine(scene, mesh, lines);
    },
  });
}

/** A head with its last `maxTails` positions behind it (C++ Velocity / MaxTails). */
function spawnTrail(scene: Scene, at: Vector3, opts: JointOptions): EffectHandle {
  const colour = opts.colour ?? RGBS.arc;
  const seconds = opts.seconds ?? DEFAULT_SECONDS;
  const tails = Math.max(1, opts.maxTails ?? DEFAULT_TAILS);
  const height = opts.height ?? 0;
  const velocity = opts.velocity ?? 0;
  const turn = opts.turn ?? 0;
  const gravity = opts.gravity ?? 0;
  const heading = opts.heading ? opts.heading.clone().normalize() : new Vector3(0, 0, 1);
  let yaw = Math.atan2(heading.x, heading.z);
  const pitch = Math.asin(Math.max(-1, Math.min(1, heading.y)));
  let vy = velocity * Math.sin(pitch);

  const head = new Vector3(at.x, at.y + height, at.z);
  if (opts.head) {
    opts.head(head);
    head.y += height;
  }
  const line = new Array<number>((tails + 1) * 3).fill(0);
  for (let i = 0; i <= tails; i++) {
    line[i * 3] = head.x;
    line[i * 3 + 1] = head.y;
    line[i * 3 + 2] = head.z;
  }
  const lines = [line];
  const mesh = makeLine(scene, lines, colour, opts.width ?? DEFAULT_WIDTH, opts.blend);
  const material = mesh.material as GreasedLineSimpleMaterial | null;

  let t = 0;
  let sinceSample = 0;

  return live.push({
    update(dt) {
      t += dt;
      const prog = t / seconds;
      if (prog >= 1 || opts.until?.()) return false;
      if (opts.head) {
        opts.head(head);
        head.y += height;
      } else {
        yaw += turn * dt;
        const flat = velocity * Math.cos(pitch);
        vy -= gravity * dt;
        head.x += Math.sin(yaw) * flat * dt;
        head.z += Math.cos(yaw) * flat * dt;
        head.y += vy * dt;
      }
      sinceSample += dt;
      if (sinceSample >= TAIL_SAMPLE_SECONDS) {
        sinceSample = 0;
        // Shift the history back one slot; slot 0 is the head.
        line.copyWithin(3, 0, tails * 3);
      }
      line[0] = head.x;
      line[1] = head.y;
      line[2] = head.z;
      mesh.setPoints(lines);
      if (material) material.visibility = fadeOut(prog, 0.3);
      return true;
    },
    release() {
      disposeLine(scene, mesh, lines);
    },
  });
}

/** Spawn helper other entries call directly (aura's orbit ribbons). */
export function spawnJoint(scene: Scene, at: Vector3, opts: JointOptions): EffectHandle {
  return opts.head || opts.velocity !== undefined ? spawnTrail(scene, at, opts) : spawnBolt(scene, at, opts);
}

function spawn(scene: Scene, at: Vector3, opts: JointOptions): EffectHandle {
  return spawnJoint(scene, at, opts);
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const jointLayer: EffectLayer<JointOptions, 'joint'> = {
  name: 'joint',
  update,
  reset,
  spawn,
};
