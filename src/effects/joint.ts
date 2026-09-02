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
 * One `GreasedLine` per joint in the joint's colour, glow-layer referenced so
 * it blooms like the item crackle. Both ends of a bolt may move, and `forks`
 * grows side branches for Lightning.
 *
 * A joint with a `texture` is drawn the way `RenderJoints` draws its tail
 * quads: the BITMAP_JOINT_* sheet runs U along the ribbon (per tail slot, not
 * per world distance — ZzzEffectJoint.cpp:7036), V across it, × the joint's
 * `Light`. The sheets are black at the edges, so under the additive blend only
 * the bright filament in the middle shows — an untextured ribbon is a solid
 * band of colour the full width of the quad strip, which is what every bolt
 * looked like (issue #4). Untextured stays supported for the plain glow
 * ribbons (aura's orbit lines).
 *
 * Driven by: `effects.spawn('joint', …)`; `aura.ts` spawns the persistent
 * orbit ribbons through `spawnJoint`. Read by: nobody.
 */
import {
  Color3,
  Constants,
  CreateGreasedLine,
  GreasedLineMeshMaterialType,
  Material,
  StandardMaterial,
  Texture,
  Vector3,
  type GreasedLineMesh,
  type IGreasedLineMaterial,
  type Scene,
} from '../libs/babylon/exports';
import { Store } from '../store';
import type { TestScene } from '../scenes/testScene';
import { LiveList, effectTexture, fadeOut, fxNow, hash, pointSource, type EffectBlend, type PointSource, type RGB } from './core';
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

/** Steering wander damping per tick: the original's `Direction *= 0.6 / 0.8`. */
const WANDER_DAMP_PITCH = 0.6;
const WANDER_DAMP_YAW = 0.8;

/** Pitch forced when a steered head leaves its terrain band (`Angle[0] = ±5`). */
const BAND_ESCAPE_PITCH = (5 * Math.PI) / 180;

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
  /**
   * Trail: steer like JOINT_SPIRIT sub0 (ZzzEffectJoint.cpp:3732-3772) — per
   * tick, home the heading on `seek` by up to `seekRate` radians
   * (MoveHumming's 10°/frame), kick damped angular velocities with uniform
   * impulses in ±`wander.pitch` / ±`wander.yaw` (the ±3.2°/±12.8° rolls,
   * damped ×0.6/×0.8), and keep the head `band` tiles above the terrain (an
   * excursion zeroes the pitch momentum and pitches 5° back in). Wins over
   * `turn`/`gravity`.
   */
  steer?: {
    seek?: PointSource;
    seekRate?: number;
    wander?: { pitch: number; yaw: number };
    band?: { floor: number; ceiling: number };
  };
  /**
   * Trail: the head's position, once a tick — the per-frame `CreateEffect`
   * stamp at a joint's head (Evil Spirit's MODEL_LASER). Read-only: copy it,
   * never keep it.
   */
  trace?: (head: Vector3) => void;
  /** Fade fraction at end of life (default 0.3). Evil Spirit's `Light = LifeTime * 0.1` is 10/49. */
  fadeTail?: number;
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
  /**
   * `Effect/Joint*` sheet run along the ribbon (recipes.ts `TEX.joint*`) —
   * the original's `BindTexture(o->Type)` per joint. Without it the ribbon is
   * a flat band of `colour`.
   */
  texture?: string;
  /** U lengths of the sheet along the ribbon (JOINT_THUNDER maps 2). */
  textureRepeats?: number;
  /** U scroll in sheet lengths/s (`Light -= Scroll`, thunder only: 1). */
  textureScroll?: number;
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

interface Line {
  mesh: GreasedLineMesh;
  /** Set the ribbon's fade 0…1 (the original's `Alpha` on the tail quads). */
  fade(vis: number): void;
  /** Step the thunder scroll; a no-op without `textureScroll`. */
  scroll(): void;
}

/**
 * The U along the ribbon per point slot — the original's
 * `(NumTails − j) / (MaxTails − 1)`: the head end at `repeats`, the oldest
 * tail at 0 (ZzzEffectJoint.cpp:7036). Four floats per point, matching the
 * two side vertices GreasedLine builds per point; explicit because the
 * auto-UVs divide by the line's *initial* length, and every joint here is
 * born with all points on one spot.
 */
function rampUVs(lines: number[][], repeats: number): number[] {
  const uvs: number[] = [];
  for (const line of lines) {
    const points = line.length / 3;
    for (let i = 0; i < points; i++) {
      const u = (1 - i / (points - 1)) * repeats;
      uvs.push(u, 0, u, 1);
    }
  }
  return uvs;
}

function makeLine(scene: Scene, lines: number[][], colour: RGB, width: number, opts: JointOptions): Line {
  const blend = opts.blend ?? 'add';
  const sheetFile = opts.texture;
  const textured = !!sheetFile;
  const repeats = opts.textureRepeats ?? 1;
  const alphaMode = blend === 'subtract' ? Constants.ALPHA_SUBTRACT : Constants.ALPHA_ADD;
  const mesh = CreateGreasedLine(
    'fxJoint',
    { points: lines, updatable: true, ...(textured ? { uvs: rampUVs(lines, repeats) } : {}) },
    {
      // With a texture the colour rides in `emissiveColor` below — the plugin's
      // own colour would *replace* the sampled texel (COLOR_MODE_SET).
      ...(textured ? {} : { color: new Color3(colour[0], colour[1], colour[2]) }),
      width,
      sizeAttenuation: false,
      materialType: textured
        ? GreasedLineMeshMaterialType.MATERIAL_TYPE_STANDARD
        : GreasedLineMeshMaterialType.MATERIAL_TYPE_SIMPLE,
    },
    scene
  ) as GreasedLineMesh;
  mesh.isPickable = false;
  mesh.doNotSyncBoundingInfo = true;
  mesh.alwaysSelectAsActiveMesh = true;

  // The length-cutoff uniform lives on the greased-line side of either
  // material type; it is a reveal, not a fade, so it only gates load state.
  const glMat = mesh.greasedLineMaterial as IGreasedLineMaterial | undefined;
  let sheet: Texture | null = null;
  let fade: (vis: number) => void;

  if (sheetFile) {
    // The plugin defaults to white + COLOR_MODE_SET when no color is given,
    // overwriting the shaded texel with a flat band; null keeps ours.
    if (glMat) glMat.color = null;
    // The sheet × `Light` under the joint's blend — the same Standard set-up
    // as core.ts `additiveMaterial` (texel × emissive tint, lighting off).
    const std = mesh.material as StandardMaterial;
    std.diffuseColor.set(0, 0, 0);
    std.specularColor.set(0, 0, 0);
    std.ambientColor.set(0, 0, 0);
    std.emissiveColor.set(colour[0], colour[1], colour[2]);
    std.disableLighting = true;
    std.alphaMode = alphaMode;
    std.transparencyMode = Material.MATERIAL_ALPHABLEND;
    std.backFaceCulling = false;
    std.disableDepthWrite = true;
    std.fogEnabled = false;
    // Hold the line unseen until the sheet is in — a texture-less Standard
    // ribbon is exactly the solid band this is here to remove.
    if (glMat) glMat.visibility = -1;
    void effectTexture(scene, sheetFile).then(tex => {
      if (mesh.isDisposed()) return;
      // Thunder scrolls and tiles along U (loaded GL_REPEAT in the original);
      // the shared texture's wrap only matters to other joints of the same
      // sheet, which want the same thing.
      if (repeats !== 1 || opts.textureScroll) tex.wrapU = Texture.WRAP_ADDRESSMODE;
      sheet = tex;
      std.diffuseTexture = tex;
      if (glMat) glMat.visibility = 1;
    });
    // A real brightness fade: the emissive tint toward black fades an
    // additive ribbon out and a subtractive one to no-op alike.
    fade = vis => std.emissiveColor.set(colour[0] * vis, colour[1] * vis, colour[2] * vis);
  } else {
    const std = mesh.material;
    if (std) {
      std.alpha = 0.99;
      std.alphaMode = alphaMode;
      std.disableDepthWrite = true;
      std.backFaceCulling = false;
    }
    // The simple material has no per-fragment alpha; the length cutoff is
    // the closest thing to the original's die-out.
    fade = vis => {
      if (glMat) glMat.visibility = vis;
    };
  }

  // A subtractive ribbon darkens what is behind it; blooming it would re-add
  // the light it just took away.
  if (blend !== 'subtract') {
    (scene as TestScene).look?.glow.referenceMeshToUseItsOwnMaterial(mesh);
  }

  const scrollRate = opts.textureScroll ?? 0;
  return {
    mesh,
    fade,
    scroll:
      scrollRate > 0
        ? () => {
            // The original's global `WorldTime % 1000 * 0.001` — every thunder
            // joint writes the same value, so sharing the texture is safe.
            if (sheet) sheet.uOffset = -((fxNow() * scrollRate) % 1);
          }
        : () => {},
  };
}

function disposeLine(scene: Scene, line: Line, lines: number[][]): void {
  const mesh = line.mesh;
  for (const l of lines) park(l);
  (scene as TestScene).look?.glow.unReferenceMeshFromUsingItsOwnMaterial(mesh);
  // Never dispose the shared empty-colours texture: itemCrackle.ts documents
  // the trap, and the plugin variant's dispose() takes `colorsTexture` down
  // with it too.
  const gl = mesh.greasedLineMaterial as unknown as
    | { colorsTexture?: unknown; _colorsTexture?: unknown }
    | undefined;
  if (gl) {
    gl.colorsTexture = null;
    gl._colorsTexture = null;
  }
  // `dispose()` without flags leaves textures alone — the sheet is
  // loadEffectTexture's shared cache.
  mesh.material?.dispose();
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
  const line = makeLine(scene, lines, colour, opts.width ?? DEFAULT_WIDTH, opts);
  const mesh = line.mesh;

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
      line.scroll();
      line.fade(fadeOut(prog, opts.fadeTail ?? 0.3) * (0.6 + 0.4 * hash(t * 97)));
      return true;
    },
    release() {
      disposeLine(scene, line, lines);
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
  const steer = opts.steer;
  const heading = opts.heading ? opts.heading.clone().normalize() : new Vector3(0, 0, 1);
  let yaw = Math.atan2(heading.x, heading.z);
  let pitch = Math.asin(Math.max(-1, Math.min(1, heading.y)));
  let vy = velocity * Math.sin(pitch);
  // Wander momentum, radians per tick (the original's `Direction[0]`/`[2]`).
  let wanderPitch = 0;
  let wanderYaw = 0;
  const seekPoint = new Vector3();

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
  const ribbon = makeLine(scene, lines, colour, opts.width ?? DEFAULT_WIDTH, opts);
  const mesh = ribbon.mesh;

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
      } else if (steer) {
        // Flight from the live angles; the angles themselves step at tick
        // cadence below, like the original's 25 Hz frames.
        const flat = velocity * Math.cos(pitch);
        head.x += Math.sin(yaw) * flat * dt;
        head.z += Math.cos(yaw) * flat * dt;
        head.y += velocity * Math.sin(pitch) * dt;
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
        if (steer) {
          if (steer.seek) {
            // MoveHumming: turn toward the target by at most `seekRate`.
            steer.seek(seekPoint);
            const dx = seekPoint.x - head.x;
            const dy = seekPoint.y - head.y;
            const dz = seekPoint.z - head.z;
            const rate = steer.seekRate ?? (10 * Math.PI) / 180;
            const dYaw = Math.atan2(dx, dz) - yaw;
            yaw += Math.max(-rate, Math.min(rate, Math.atan2(Math.sin(dYaw), Math.cos(dYaw))));
            const dPitch = Math.atan2(dy, Math.hypot(dx, dz) || 1) - pitch;
            pitch += Math.max(-rate, Math.min(rate, dPitch));
          }
          const w = steer.wander;
          if (w) {
            wanderPitch += (Math.random() * 2 - 1) * w.pitch;
            wanderYaw += (Math.random() * 2 - 1) * w.yaw;
            pitch += wanderPitch;
            yaw += wanderYaw;
            wanderPitch *= WANDER_DAMP_PITCH;
            wanderYaw *= WANDER_DAMP_YAW;
          }
          const band = steer.band;
          if (band) {
            // -9999 until the map's height data is in; skip the clamp then.
            const ground = Store.world?.getTerrainHeight(head.x, head.z) ?? -9999;
            if (ground > -9000) {
              if (head.y < ground + band.floor) {
                wanderPitch = 0;
                pitch = BAND_ESCAPE_PITCH;
              } else if (head.y > ground + band.ceiling) {
                wanderPitch = 0;
                pitch = -BAND_ESCAPE_PITCH;
              }
            }
          }
        }
        // Shift the history back one slot; slot 0 is the head.
        line.copyWithin(3, 0, tails * 3);
        opts.trace?.(head);
      }
      line[0] = head.x;
      line[1] = head.y;
      line[2] = head.z;
      mesh.setPoints(lines);
      ribbon.scroll();
      ribbon.fade(fadeOut(prog, opts.fadeTail ?? 0.3));
      return true;
    },
    release() {
      disposeLine(scene, ribbon, lines);
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
