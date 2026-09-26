/**
 * Spirit swarm - Evil Spirit's black dragons as one flock: each spirit is a
 * steered JOINT_SPIRIT head (ZzzEffectJoint.cpp:3732-3772) dragging a dark
 * body, two braided wisps and a darker spine, with the MODEL_LASER skull
 * (RENDER_DARK) seated on its head (ZzzEffect.cpp:1890).
 *
 * The same flight and the same art as four `joint` trails and three `model`
 * stamps per spirit, drawn with four meshes for the whole wave: the bodies and
 * wisps share one ribbon mesh, the spines another, and the skulls are thin
 * instances of one silhouette mesh and one sheet mesh. Every ribbon moves in
 * place (greasedLineInPlace.ts) and each body's curve is smoothed once for its
 * wisps and spine too, where the separate trails each rebuilt their own
 * GreasedLine every frame (2.8 ms a frame for one cast). A finished wave's
 * meshes wait in a small pool for the next cast, so a cast builds nothing
 * after the first.
 *
 * The order is the trails' own: the wisps, the spine and the skull ride the
 * head where it was a frame ago, as the followers of a `track`ed head did, so
 * the followers keep a history of their own.
 *
 * Driven by: `effects.spawn('spiritSwarm', …)` (skillVisuals.ts row 9). Read by: nobody.
 */
import {
  Constants,
  CreateGreasedLine,
  GreasedLineMeshMaterialType,
  Material,
  Matrix,
  Quaternion,
  TransformNode,
  Vector3,
  type GreasedLineMesh,
  type IGreasedLineMaterial,
  type Mesh,
  type Scene,
  type StandardMaterial,
  type Texture,
} from '../libs/babylon/exports';
import { loadGLTF } from '../common/modelLoader';
import { Store } from '../store';
import type { TestScene } from '../scenes/testScene';
import { clampAlpha } from './clampAlpha';
import { LiveList, darkCardGain, effectTexture, fadeOut, luma, type PointSource, type RGB } from './core';
import { inPlaceLines, type InPlaceLines } from './greasedLineInPlace';
import { releaseGreasedLineMaterial } from './greasedLineRelease';
import type { TaperShape } from './joint';
import { reseat, subtractMaterial } from './model';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** A head records its position once a tick, like joint.ts trails. */
const TAIL_SAMPLE_SECONDS = 0.04;

/** Wander damping per tick and the band escape pitch (joint.ts: the original's `Direction *= 0.6 / 0.8`, `Angle[0] = ±5`). */
const WANDER_DAMP_PITCH = 0.6;
const WANDER_DAMP_YAW = 0.8;
const BAND_ESCAPE_PITCH = (5 * Math.PI) / 180;

/** joint.ts `taper: true`: nose width and reach, tail falloff. */
const NOSE_WIDTH = 0.5;
const NOSE_SPAN = 0.12;
const TAIL_FALLOFF = 0.55;

/** The sway grows in over this much of the ribbon behind the head (joint.ts waveLine). */
const WAVE_NECK = 0.2;

/** Finished waves kept for reuse: two waves a cast, and a second cast can overlap the first. */
const POOL_MAX = 4;

/** Skull meshes stand up the way model.ts stands every skill mesh. */
const UPRIGHT = Quaternion.FromEulerAngles(-Math.PI / 2, 0, 0);

// ---- 2. state + readers ----------------------------------------------------

export interface SwarmWave {
  amplitude: number;
  cycles: number;
  speed: number;
  phase?: number;
}

export interface SwarmRibbon {
  width: number;
  colour: RGB;
  /** The most the coverage gain may reach, whatever the map's dark gain asks for. */
  maxCover: number;
  texture: string;
  taper: TaperShape;
}

export interface SwarmSpirit {
  /** Tiles/s. */
  velocity: number;
  heading: Vector3;
  /** The point the head homes on. */
  seek: PointSource;
  /** The head's position every frame, for things that ride it (its smoke). */
  track?: (head: Vector3) => void;
}

export interface SpiritSwarmOptions {
  spirits: SwarmSpirit[];
  seconds: number;
  fadeTail: number;
  /** Ticks of history behind each head, and curve pieces per tick. */
  tails: number;
  smooth: number;
  /** joint.ts `steer` without its `seek`, shared by every spirit. */
  seekRate: number;
  wander: { pitch: number; yaw: number };
  band: { floor: number; ceiling: number };
  body: SwarmRibbon & { wave: SwarmWave };
  /** Thin ribbons braided round the body, drawn with the body's sheet and coverage. */
  wisps: { width: number; taper?: TaperShape; waves: SwarmWave[] };
  /** The darker middle line, swaying with the body. */
  spine: SwarmRibbon;
  skull: {
    model: string;
    scale: number;
    /** Added to the flight yaw, for a mesh whose nose is not its +Z. */
    aimYaw: number;
    /** model.ts `rearAt`. */
    rearAt: number;
    /** An even coverage over the whole mesh under the sheet (model.ts `solid`). */
    silhouette: RGB;
    silhouetteCover: number;
    sheet: RGB;
    sheetCover: number;
    /** Sheet passes stacked on each skull. */
    passes: number;
  };
}

const live = new LiveList();

/** How many swarms are up (debug). */
export function spiritSwarmCount(): number {
  return live.size;
}

function taper(s: number, shape: TaperShape): number {
  const noseWidth = shape.nose ?? NOSE_WIDTH;
  const span = shape.span ?? NOSE_SPAN;
  const hold = shape.hold ?? 0;
  const falloff = shape.falloff ?? TAIL_FALLOFF;
  const nose = Math.min(1, noseWidth + (s * (1 - noseWidth)) / span);
  return nose * Math.pow(1 - Math.max(0, s - hold) / (1 - hold), falloff);
}

interface Ribbon {
  mesh: GreasedLineMesh;
  lines: InPlaceLines | null;
  std: StandardMaterial;
  spec: SwarmRibbon;
  /** Coverage at full strength: the map's dark gain, capped. */
  gain: number;
}

const ribbonGain = (scene: Scene, r: SwarmRibbon): number => Math.min(r.maxCover, luma(r.colour) * darkCardGain(scene));

/** `count` dark textured lines of `n` points in one GreasedLine, set up as joint.ts `makeLine` sets up a subtract ribbon with a sheet. */
function darkRibbon(scene: Scene, at: Vector3, count: number, n: number, widths: number[], r: SwarmRibbon): Ribbon {
  const lines: number[][] = [];
  const uvs: number[] = [];
  for (let l = 0; l < count; l++) {
    const line = new Array<number>(n * 3);
    for (let i = 0; i < n; i++) {
      line[i * 3] = at.x;
      line[i * 3 + 1] = at.y;
      line[i * 3 + 2] = at.z;
      const u = 1 - i / (n - 1);
      uvs.push(u, 0, u, 1);
    }
    lines.push(line);
  }
  const mesh = CreateGreasedLine(
    'fxSpiritSwarm',
    { points: lines, updatable: true, uvs, widths },
    { width: r.width, sizeAttenuation: false, materialType: GreasedLineMeshMaterialType.MATERIAL_TYPE_STANDARD },
    scene
  ) as GreasedLineMesh;
  mesh.isPickable = false;
  mesh.doNotSyncBoundingInfo = true;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.metadata = { brightMesh: false };
  const glMat = mesh.greasedLineMaterial as IGreasedLineMaterial | undefined;
  if (glMat) glMat.color = null;
  const std = mesh.material as StandardMaterial;
  const gain = ribbonGain(scene, r);
  std.diffuseColor.set(0, 0, 0);
  std.specularColor.set(0, 0, 0);
  std.ambientColor.set(0, 0, 0);
  std.emissiveColor.set(0, 0, 0);
  std.alpha = gain;
  clampAlpha(std);
  std.disableLighting = true;
  std.alphaMode = Constants.ALPHA_COMBINE;
  std.transparencyMode = Material.MATERIAL_ALPHABLEND;
  std.backFaceCulling = false;
  std.disableDepthWrite = true;
  std.fogEnabled = false;
  if (glMat) glMat.visibility = -1;
  void effectTexture(scene, r.texture).then(tex => {
    if (mesh.isDisposed()) return;
    tex.getAlphaFromRGB = true;
    std.opacityTexture = tex;
    if (glMat) glMat.visibility = 1;
  });
  (scene as TestScene).look?.glow.addExcludedMesh(mesh);
  return { mesh, lines: inPlaceLines(mesh, n, count), std, spec: r, gain };
}

function releaseRibbon(scene: Scene, r: Ribbon): void {
  r.lines?.dispose();
  (scene as TestScene).look?.glow.removeExcludedMesh(r.mesh);
  releaseGreasedLineMaterial(r.mesh);
  r.mesh.dispose();
}

/** Catmull-Rom through `count` points of `src` from `si`, `steps` pieces per segment, into `out` from `oi` (joint.ts resampleCurve). */
function resample(src: Float32Array, si: number, count: number, out: Float32Array, oi: number, steps: number): void {
  let o = oi;
  for (let i = 0; i < count - 1; i++) {
    const a = si + Math.max(0, i - 1) * 3;
    const b = si + i * 3;
    const c = si + (i + 1) * 3;
    const d = si + Math.min(count - 1, i + 2) * 3;
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      for (let j = 0; j < 3; j++) {
        const p0 = src[a + j];
        const p1 = src[b + j];
        const p2 = src[c + j];
        const p3 = src[d + j];
        out[o++] = 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
      }
    }
  }
  const e = si + (count - 1) * 3;
  out[o] = src[e];
  out[o + 1] = src[e + 1];
  out[o + 2] = src[e + 2];
}

/** Flat unit normals across a curve of `n` points (0 where it has no heading), two per point. */
function normals(curve: Float32Array, ci: number, n: number, out: Float32Array, oi: number): void {
  out[oi] = 0;
  out[oi + 1] = 0;
  for (let p = 1; p < n; p++) {
    const a = ci + Math.min(n - 1, p + 1) * 3;
    const b = ci + (p - 1) * 3;
    const tx = curve[a] - curve[b];
    const tz = curve[a + 2] - curve[b + 2];
    const len = Math.sqrt(tx * tx + tz * tz);
    const o = oi + p * 2;
    if (len < 1e-5) {
      out[o] = 0;
      out[o + 1] = 0;
    } else {
      out[o] = -tz / len;
      out[o + 1] = tx / len;
    }
  }
}

/** A wave's per-point amplitude split into sin / cos parts, so a frame needs one sin and one cos per wave (joint.ts waveLine). */
function waveTable(w: SwarmWave, n: number): Float32Array {
  const table = new Float32Array(n * 2);
  for (let p = 0; p < n; p++) {
    const s = p / (n - 1);
    const neck = Math.min(1, s / WAVE_NECK);
    const amp = w.amplitude * neck * neck * (3 - 2 * neck);
    const a = Math.PI * 2 * w.cycles * s + (w.phase ?? 0);
    table[p * 2] = amp * Math.sin(a);
    table[p * 2 + 1] = amp * Math.cos(a);
  }
  return table;
}

/** The curve swayed sideways by a wave travelling down it, into `out` from `oi`. */
function sway(
  curve: Float32Array,
  ci: number,
  nrm: Float32Array,
  ni: number,
  n: number,
  table: Float32Array,
  cosC: number,
  sinC: number,
  out: Float32Array,
  oi: number
): void {
  for (let p = 0; p < n; p++) {
    const c = ci + p * 3;
    const o = oi + p * 3;
    const off = table[p * 2] * cosC - table[p * 2 + 1] * sinC;
    out[o] = curve[c] + nrm[ni + p * 2] * off;
    out[o + 1] = curve[c + 1];
    out[o + 2] = curve[c + 2] + nrm[ni + p * 2 + 1] * off;
  }
}

interface Flier {
  head: Vector3;
  yaw: number;
  pitch: number;
  wanderPitch: number;
  wanderYaw: number;
  velocity: number;
  seek: PointSource;
  track?: (head: Vector3) => void;
  /** The skull's position and yaw (model.ts `follow` + `aim`). */
  skull: Vector3;
  skullYaw: number;
}

interface SkullMesh {
  mesh: Mesh;
  matrices: Float32Array;
  template: Matrix;
  passes: number;
}

/** One wave's meshes: the body + wisps ribbon, the spine ribbon, the skull meshes. Pooled between casts. */
interface Rig {
  scene: Scene;
  opts: SpiritSwarmOptions;
  count: number;
  n: number;
  body: Ribbon;
  spine: Ribbon;
  bodyTable: Float32Array;
  wispTables: Float32Array[];
  skulls: SkullMesh[];
  skullMats: { mat: StandardMaterial; colour: RGB; max: number; cover: number }[];
  active: boolean;
  disposed: boolean;
}

const pool: Rig[] = [];

const seekPoint = new Vector3();
const nodeScale = new Vector3();
const nodeRot = new Quaternion();
const nodeMatrix = new Matrix();
const skullMatrix = new Matrix();

function buildRig(scene: Scene, at: Vector3, opts: SpiritSwarmOptions, count: number, n: number): Rig {
  const wisps = opts.wisps.waves.length;
  const wispRatio = opts.wisps.width / opts.body.width;
  const bodyWidths: number[] = [];
  const spineWidths: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let p = 0; p < n; p++) {
      const w = taper(p / (n - 1), opts.body.taper);
      bodyWidths.push(w, w);
    }
    for (let k = 0; k < wisps; k++) {
      for (let p = 0; p < n; p++) {
        const w = taper(p / (n - 1), opts.wisps.taper ?? {}) * wispRatio;
        bodyWidths.push(w, w);
      }
    }
    for (let p = 0; p < n; p++) {
      const w = taper(p / (n - 1), opts.spine.taper);
      spineWidths.push(w, w);
    }
  }
  const rig: Rig = {
    scene,
    opts,
    count,
    n,
    body: darkRibbon(scene, at, count * (1 + wisps), n, bodyWidths, opts.body),
    spine: darkRibbon(scene, at, count, n, spineWidths, opts.spine),
    bodyTable: waveTable(opts.body.wave, n),
    wispTables: opts.wisps.waves.map(w => waveTable(w, n)),
    skulls: [],
    skullMats: [],
    active: true,
    disposed: false,
  };

  // The skulls: thin instances of one silhouette mesh and one sheet mesh, each instance a
  // spirit's model.ts node (scale, aim yaw, position) over the mesh's own seated frame.
  const sk = opts.skull;
  const world = Store.world;
  const loadSkull = (sheet: boolean): void => {
    if (!world) return;
    void loadGLTF(sk.model, world)
      .then(gltf => {
        if (rig.disposed) {
          gltf.mesh.dispose(false, false);
          return;
        }
        for (const g of gltf.animationGroups) g.dispose();
        const seat = new TransformNode('fxSpiritSeat', scene);
        gltf.mesh.setParent(seat);
        gltf.mesh.position.setAll(0);
        gltf.mesh.scaling.set(1, -1, 1);
        gltf.mesh.rotationQuaternion = UPRIGHT.clone();
        reseat(seat, gltf.mesh, sk.rearAt);
        const owned: StandardMaterial[] = [];
        const colour = sheet ? sk.sheet : sk.silhouette;
        const max = sheet ? sk.sheetCover : sk.silhouetteCover;
        const passes = sheet ? Math.max(1, sk.passes) : 1;
        for (const child of gltf.mesh.getChildMeshes(false) as Mesh[]) {
          if (!child.getTotalVertices()) continue;
          const template = child.computeWorldMatrix(true).clone();
          // Thin instances live on the Geometry, which loadGLTF clones share.
          child.makeGeometryUnique();
          child.parent = world.mapParent;
          child.position.setAll(0);
          child.rotationQuaternion = Quaternion.Identity();
          child.scaling.setAll(1);
          child.isPickable = false;
          child.alwaysSelectAsActiveMesh = true;
          child.doNotSyncBoundingInfo = true;
          // The converted COLOR_0 on the skill models is noise (model.ts).
          child.useVertexColors = false;
          child.hasVertexAlpha = false;
          child.metadata = { ...child.metadata, brightMesh: false };
          const tex = child.metadata.diffuseTexture as Texture | undefined;
          child.material = subtractMaterial(scene, sheet ? (tex ?? null) : null, owned);
          (scene as TestScene).look?.glow.addExcludedMesh(child);
          const matrices = new Float32Array(count * passes * 16);
          child.thinInstanceSetBuffer('matrix', matrices, 16, false);
          child.setEnabled(rig.active);
          rig.skulls.push({ mesh: child, matrices, template, passes });
        }
        for (const mat of owned) {
          mat.alpha = 0;
          rig.skullMats.push({ mat, colour, max, cover: Math.min(max, luma(colour) * darkCardGain(scene)) });
        }
        gltf.mesh.dispose(false, false);
        seat.dispose(false, false);
      })
      .catch(err => console.warn('[effects] spirit skull failed', sk.model, err));
  };
  loadSkull(false);
  loadSkull(true);
  return rig;
}

function showRig(rig: Rig, on: boolean): void {
  rig.active = on;
  rig.body.mesh.setEnabled(on);
  rig.spine.mesh.setEnabled(on);
  for (const s of rig.skulls) s.mesh.setEnabled(on);
}

/** A pooled rig for these options, or a new one; parked on `at` with the map's gains. */
function acquireRig(scene: Scene, at: Vector3, opts: SpiritSwarmOptions, count: number, n: number): Rig {
  const i = pool.findIndex(
    r =>
      r.scene === scene &&
      r.count === count &&
      r.n === n &&
      r.opts.body === opts.body &&
      r.opts.wisps === opts.wisps &&
      r.opts.spine === opts.spine &&
      r.opts.skull === opts.skull
  );
  if (i < 0) return buildRig(scene, at, opts, count, n);
  const rig = pool[i];
  pool.splice(i, 1);
  for (const r of [rig.body, rig.spine]) {
    r.gain = ribbonGain(scene, r.spec);
    r.std.alpha = r.gain;
    const pts = r.lines?.points;
    if (pts) {
      for (let k = 0; k < pts.length; k += 3) {
        pts[k] = at.x;
        pts[k + 1] = at.y;
        pts[k + 2] = at.z;
      }
      r.lines?.write();
    }
  }
  for (const m of rig.skullMats) {
    m.cover = Math.min(m.max, luma(m.colour) * darkCardGain(scene));
    m.mat.alpha = 0;
  }
  showRig(rig, true);
  return rig;
}

function disposeRig(rig: Rig): void {
  rig.disposed = true;
  releaseRibbon(rig.scene, rig.body);
  releaseRibbon(rig.scene, rig.spine);
  for (const s of rig.skulls) {
    (rig.scene as TestScene).look?.glow.removeExcludedMesh(s.mesh);
    s.mesh.dispose(false, false);
  }
  for (const m of rig.skullMats) m.mat.dispose(false, false);
  rig.skulls.length = 0;
  rig.skullMats.length = 0;
}

function releaseRig(rig: Rig): void {
  showRig(rig, false);
  if (pool.length < POOL_MAX && !rig.body.mesh.isDisposed() && !rig.scene.isDisposed) pool.push(rig);
  else disposeRig(rig);
}

function spawn(scene: Scene, at: Vector3, opts: SpiritSwarmOptions): EffectHandle {
  const count = opts.spirits.length;
  const tails = Math.max(1, opts.tails);
  const steps = Math.max(1, Math.round(opts.smooth));
  const hn = tails + 1;
  const n = tails * steps + 1;
  const wisps = opts.wisps.waves.length;
  const perSpirit = 1 + wisps;
  const sk = opts.skull;

  const fliers: Flier[] = opts.spirits.map(s => {
    const h = s.heading.clone().normalize();
    return {
      head: at.clone(),
      yaw: Math.atan2(h.x, h.z),
      pitch: Math.asin(Math.max(-1, Math.min(1, h.y))),
      wanderPitch: 0,
      wanderYaw: 0,
      velocity: s.velocity,
      seek: s.seek,
      track: s.track,
      skull: at.clone(),
      skullYaw: 0,
    };
  });

  // The head's history per spirit and the followers' (a frame behind), each smoothed with its normals.
  const hist = new Float32Array(count * hn * 3);
  for (let i = 0; i < count * hn; i++) {
    hist[i * 3] = at.x;
    hist[i * 3 + 1] = at.y;
    hist[i * 3 + 2] = at.z;
  }
  const fhist = hist.slice();
  const curve = new Float32Array(count * n * 3);
  const fcurve = new Float32Array(count * n * 3);
  const nrm = new Float32Array(count * n * 2);
  const fnrm = new Float32Array(count * n * 2);
  const rig = acquireRig(scene, at, opts, count, n);
  const { body, spine, bodyTable, wispTables, skulls, skullMats } = rig;

  let t = 0;
  let sinceSample = 0;

  const fly = (f: Flier, dt: number, sample: boolean): void => {
    const h = f.head;
    const flat = f.velocity * Math.cos(f.pitch);
    h.x += Math.sin(f.yaw) * flat * dt;
    h.z += Math.cos(f.yaw) * flat * dt;
    h.y += f.velocity * Math.sin(f.pitch) * dt;
    if (!sample) return;
    // joint.ts `steer`: MoveHumming toward the seek point, the damped wander, the terrain band.
    f.seek(seekPoint);
    const dx = seekPoint.x - h.x;
    const dy = seekPoint.y - h.y;
    const dz = seekPoint.z - h.z;
    const rate = opts.seekRate;
    const dYaw = Math.atan2(dx, dz) - f.yaw;
    f.yaw += Math.max(-rate, Math.min(rate, Math.atan2(Math.sin(dYaw), Math.cos(dYaw))));
    const dPitch = Math.atan2(dy, Math.hypot(dx, dz) || 1) - f.pitch;
    f.pitch += Math.max(-rate, Math.min(rate, dPitch));
    f.wanderPitch += (Math.random() * 2 - 1) * opts.wander.pitch;
    f.wanderYaw += (Math.random() * 2 - 1) * opts.wander.yaw;
    f.pitch += f.wanderPitch;
    f.yaw += f.wanderYaw;
    f.wanderPitch *= WANDER_DAMP_PITCH;
    f.wanderYaw *= WANDER_DAMP_YAW;
    const ground = Store.world?.getTerrainHeight(h.x, h.z) ?? -9999;
    if (ground > -9000) {
      if (h.y < ground + opts.band.floor) {
        f.wanderPitch = 0;
        f.pitch = BAND_ESCAPE_PITCH;
      } else if (h.y > ground + opts.band.ceiling) {
        f.wanderPitch = 0;
        f.pitch = -BAND_ESCAPE_PITCH;
      }
    }
  };

  return live.push({
    update(dt) {
      t += dt;
      const prog = t / opts.seconds;
      if (prog >= 1) return false;
      const vis = fadeOut(prog, opts.fadeTail);

      // Skulls first: they sit where the heads were last frame (model.ts steps before the trails).
      for (let i = 0; i < count; i++) {
        const f = fliers[i];
        const dx = f.head.x - f.skull.x;
        const dz = f.head.z - f.skull.z;
        if (dx * dx + dz * dz > 1e-8) f.skullYaw = Math.atan2(dx, dz) + sk.aimYaw;
        f.skull.copyFrom(f.head);
      }
      if (skulls.length) {
        nodeScale.setAll(sk.scale);
        for (let i = 0; i < count; i++) {
          const f = fliers[i];
          Quaternion.RotationYawPitchRollToRef(f.skullYaw, 0, 0, nodeRot);
          Matrix.ComposeToRef(nodeScale, nodeRot, f.skull, nodeMatrix);
          for (const s of skulls) {
            s.template.multiplyToRef(nodeMatrix, skullMatrix);
            for (let k = 0; k < s.passes; k++) skullMatrix.copyToArray(s.matrices, (i * s.passes + k) * 16);
          }
        }
        for (const s of skulls) s.mesh.thinInstanceBufferUpdated('matrix');
        for (const m of skullMats) m.mat.alpha = m.cover * vis;
      }

      // The heads fly, newest spirit first: the order joint.ts drew the wander's random numbers in.
      sinceSample += dt;
      const sample = sinceSample >= TAIL_SAMPLE_SECONDS;
      if (sample) sinceSample = 0;
      for (let i = count - 1; i >= 0; i--) {
        const f = fliers[i];
        const hi = i * hn * 3;
        if (sample) fhist.copyWithin(hi + 3, hi, hi + tails * 3);
        fhist[hi] = f.head.x;
        fhist[hi + 1] = f.head.y;
        fhist[hi + 2] = f.head.z;
        fly(f, dt, sample);
        if (sample) hist.copyWithin(hi + 3, hi, hi + tails * 3);
        hist[hi] = f.head.x;
        hist[hi + 1] = f.head.y;
        hist[hi + 2] = f.head.z;
        f.track?.(f.head);
      }

      const bodyPts = body.lines?.points;
      const spinePts = spine.lines?.points;
      const cb = t * opts.body.wave.speed;
      const cosB = Math.cos(cb);
      const sinB = Math.sin(cb);
      for (let i = 0; i < count; i++) {
        const ci = i * n * 3;
        const ni = i * n * 2;
        resample(hist, i * hn * 3, hn, curve, ci, steps);
        normals(curve, ci, n, nrm, ni);
        resample(fhist, i * hn * 3, hn, fcurve, ci, steps);
        normals(fcurve, ci, n, fnrm, ni);
        if (bodyPts) {
          const bi = i * perSpirit * n * 3;
          sway(curve, ci, nrm, ni, n, bodyTable, cosB, sinB, bodyPts, bi);
          for (let k = 0; k < wisps; k++) {
            const cw = t * opts.wisps.waves[k].speed;
            sway(fcurve, ci, fnrm, ni, n, wispTables[k], Math.cos(cw), Math.sin(cw), bodyPts, bi + (k + 1) * n * 3);
          }
        }
        if (spinePts) sway(fcurve, ci, fnrm, ni, n, bodyTable, cosB, sinB, spinePts, ci);
      }
      body.lines?.write();
      spine.lines?.write();
      body.std.alpha = body.gain * vis;
      spine.std.alpha = spine.gain * vis;
      return true;
    },
    release() {
      releaseRig(rig);
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
  for (const rig of pool) disposeRig(rig);
  pool.length = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const spiritSwarmLayer: EffectLayer<SpiritSwarmOptions, 'spiritSwarm'> = {
  name: 'spiritSwarm',
  update,
  reset,
  spawn,
};
