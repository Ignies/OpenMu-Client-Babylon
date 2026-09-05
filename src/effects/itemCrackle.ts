import {
  Color3,
  Constants,
  CreateGreasedLine,
  GreasedLineMeshMaterialType,
  type GreasedLineMesh,
  type GreasedLineSimpleMaterial,
  type Scene,
  Vector3,
} from '../libs/babylon/exports';
import type { ItemVisualTier } from '../common/itemVisualTier';
import type { TestScene } from '../scenes/testScene';
import { releaseGreasedLineMaterial } from './greasedLineRelease';
import type { ItemAuraKind } from './itemAura';
import { DEAD_HANDLE, type EffectHandle, type EffectLayer } from './layer';

/**
 * Energy crackle (improved look, +9 and up): short lightning arcs that flash
 * over the body in the item's colour — a few times a second, each living a
 * handful of frames, jittering while alive.
 *
 * One GreasedLine mesh per wearer with a fixed topology (bolts × segments
 * per glow tier, plus a fork slot per bolt),
 * re-pointed in place; inactive bolts are parked far below the map. The mesh
 * is registered with the GlowLayer to render with its own material, so the
 * arcs bloom in the same colour as the armour's halo.
 *
 * Driven by: `createItemCrackle` from `ecs/systems/itemGlowSystem.ts`, or
 * `effects.spawn('itemCrackle', …)`. Read by: nobody.
 */

// ---- 1. tuning -------------------------------------------------------------

/**
 * Per glow tier (itemVisualTier.glow 2–4): how many arcs may live at once,
 * how many segments each has, their width (tile units, no size attenuation),
 * and the chance an arc grows a fork off its middle. Higher tiers are denser
 * and jaggier, so +9, +11 and +13 look different before the spawn rate is
 * even considered.
 */
type CrackleShape = {
  bolts: number;
  segments: number;
  width: number;
  fork: number;
};

const SHAPES: Record<number, CrackleShape> = {
  2: { bolts: 6, segments: 8, width: 0.022, fork: 0 },
  3: { bolts: 10, segments: 10, width: 0.028, fork: 0.5 },
  4: { bolts: 14, segments: 12, width: 0.034, fork: 0.8 },
};

/** Fork length as a fraction of the parent arc. */
const FORK_LEN = 0.55;

const BOLT_LIFE_MIN = 0.08;
const BOLT_LIFE_MAX = 0.2;

/** Arc length over the body (fraction of the body radius), and jitter. */
const ARC_MIN = 0.9;
const ARC_MAX = 1.9;
const JITTER = 0.05;

const PARKED_Y = -1000;

type Body = {
  radius: number;
  bottom: number;
  top: number;
};

const BODIES: Record<ItemAuraKind, Body> = {
  character: { radius: 0.27, bottom: 0.2, top: 1.15 },
  drop: { radius: 0.17, bottom: 0.02, top: 0.28 },
};

type Bolt = {
  age: number;
  life: number;
  from: Vector3;
  to: Vector3;
  /** Fork off the middle of this arc (a second line slot), or none. */
  forked: boolean;
  forkTo: Vector3;
};

// ---- 2. state + readers ----------------------------------------------------

export type ItemCrackle = EffectHandle & {
  readonly position: Vector3;
  /** Same as `stop()`; the name itemGlowSystem has always used. */
  dispose(): void;
};

export interface ItemCrackleOptions {
  tier: ItemVisualTier;
  kind: ItemAuraKind;
}

/** Every crackle handed out and not yet disposed — so a map change can end them. */
const liveCrackles = new Set<ItemCrackle>();

/** How many crackles are running (debug). */
export function itemCrackleCount(): number {
  return liveCrackles.size;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Random point on the body's cylinder surface (local space). */
function surfacePoint(body: Body, out: Vector3): Vector3 {
  const angle = Math.random() * Math.PI * 2;
  out.set(
    Math.cos(angle) * body.radius,
    rand(body.bottom, body.top),
    Math.sin(angle) * body.radius
  );
  return out;
}

/** Push `p` back onto the body cylinder (keeps arcs hugging the surface). */
function toSurface(body: Body, p: Vector3): void {
  const d = Math.hypot(p.x, p.z) || 1;
  const k = body.radius / d;
  p.x *= k;
  p.z *= k;
  p.y = Math.min(body.top, Math.max(body.bottom, p.y));
}

export function createItemCrackle(
  scene: Scene,
  tier: ItemVisualTier,
  kind: ItemAuraKind,
  x: number,
  y: number,
  z: number
): ItemCrackle | null {
  if (tier.crackleRate <= 0) return null;

  const body = BODIES[kind];
  const position = new Vector3(x, y, z);
  const shapeOf = SHAPES[tier.glow] ?? SHAPES[2];
  const BOLTS = shapeOf.bolts;
  const SEGMENTS = shapeOf.segments;
  const WIDTH = shapeOf.width;

  // Flat xyz arrays — one per bolt, then one fork slot per bolt — the shape
  // GreasedLine rebuilds fastest. Line b is bolt b; line BOLTS + b its fork.
  const lines: number[][] = [];
  const bolts: Bolt[] = [];

  for (let b = 0; b < BOLTS * 2; b++) {
    const points: number[] = [];
    for (let s = 0; s <= SEGMENTS; s++) points.push(0, PARKED_Y, 0);
    lines.push(points);
  }
  for (let b = 0; b < BOLTS; b++) {
    bolts.push({
      age: 0,
      life: 0,
      from: new Vector3(),
      to: new Vector3(),
      forked: false,
      forkTo: new Vector3(),
    });
  }

  const [r, g, bl] = tier.emissive;
  const colour = new Color3(r, g, bl);

  const mesh = CreateGreasedLine(
    'itemCrackle',
    { points: lines, updatable: true },
    {
      color: colour,
      width: WIDTH,
      sizeAttenuation: false,
      materialType: GreasedLineMeshMaterialType.MATERIAL_TYPE_SIMPLE,
    },
    scene
  ) as GreasedLineMesh;

  mesh.isPickable = false;
  mesh.doNotSyncBoundingInfo = true;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.metadata = { itemTier: tier, itemCrackle: true };

  const material = mesh.material as GreasedLineSimpleMaterial | null;

  if (material) {
    // Additive over the armour, never into the depth buffer.
    material.alpha = 0.99;
    material.alphaMode = Constants.ALPHA_ADD;
    material.disableDepthWrite = true;
    material.backFaceCulling = false;
  }

  (scene as TestScene).look?.glow.referenceMeshToUseItsOwnMaterial(mesh);

  const tmp = new Vector3();

  function spawn(bolt: Bolt): void {
    bolt.age = 0;
    bolt.life = rand(BOLT_LIFE_MIN, BOLT_LIFE_MAX);
    surfacePoint(body, bolt.from);

    // End point: a step around / along the surface from the start.
    const len = body.radius * rand(ARC_MIN, ARC_MAX);
    const dir = Math.random() * Math.PI * 2;
    bolt.to.set(
      bolt.from.x + Math.cos(dir) * len,
      bolt.from.y + rand(-len, len),
      bolt.from.z + Math.sin(dir) * len
    );
    toSurface(body, bolt.to);

    // Fork: a shorter branch leaving the middle of the arc sideways.
    bolt.forked = Math.random() < shapeOf.fork;
    if (bolt.forked) {
      const fdir = dir + (Math.random() < 0.5 ? 1 : -1) * rand(0.9, 2.0);
      const flen = len * FORK_LEN;
      bolt.forkTo.set(
        (bolt.from.x + bolt.to.x) * 0.5 + Math.cos(fdir) * flen,
        (bolt.from.y + bolt.to.y) * 0.5 + rand(-flen, flen),
        (bolt.from.z + bolt.to.z) * 0.5 + Math.sin(fdir) * flen
      );
      toSurface(body, bolt.forkTo);
    }
  }

  const mid = new Vector3();

  /** Re-points bolt b (and its fork slot) for its current state. */
  function shapeBolt(b: number, active: boolean): void {
    const bolt = bolts[b];
    shape(bolt.from, bolt.to, lines[b], active);
    const fork = active && bolt.forked;
    if (fork) Vector3.LerpToRef(bolt.from, bolt.to, 0.5, mid);
    shape(mid, bolt.forkTo, lines[BOLTS + b], fork);
  }

  function shape(
    from: Vector3,
    to: Vector3,
    points: number[],
    active: boolean
  ): void {
    if (!active) {
      for (let i = 0; i < points.length; i += 3) {
        points[i] = 0;
        points[i + 1] = PARKED_Y;
        points[i + 2] = 0;
      }
      return;
    }

    for (let s = 0; s <= SEGMENTS; s++) {
      const t = s / SEGMENTS;
      Vector3.LerpToRef(from, to, t, tmp);

      if (s > 0 && s < SEGMENTS) {
        // Jitter grows towards the middle of the arc, and pushes outward a
        // touch so the bolt sits just off the skin.
        const k = Math.sin(t * Math.PI);
        tmp.x += rand(-JITTER, JITTER) * k;
        tmp.y += rand(-JITTER, JITTER) * k;
        tmp.z += rand(-JITTER, JITTER) * k;
        const d = Math.hypot(tmp.x, tmp.z) || 1;
        const push = (body.radius * (1 + 0.1 * k)) / d;
        tmp.x *= push;
        tmp.z *= push;
      }

      const i = s * 3;
      points[i] = tmp.x + position.x;
      points[i + 1] = tmp.y + position.y;
      points[i + 2] = tmp.z + position.z;
    }
  }

  const observer = scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    let dirty = false;

    // Poisson-ish spawning at crackleRate arcs per second, into free slots.
    // Expected crackleRate * dt arcs this frame: whole part plus a roll on
    // the fraction, so high rates are not capped at two a frame.
    const expect = tier.crackleRate * dt;
    let spawns = Math.floor(expect);
    if (Math.random() < expect - spawns) spawns++;

    for (let b = 0; b < BOLTS; b++) {
      const bolt = bolts[b];
      const wasActive = bolt.age < bolt.life;

      if (wasActive) {
        bolt.age += dt;
        shapeBolt(b, bolt.age < bolt.life);
        dirty = true;
      } else if (spawns > 0) {
        spawns--;
        spawn(bolt);
        shapeBolt(b, true);
        dirty = true;
      }
    }

    if (!dirty) return;

    mesh.setPoints(lines);

    // Flicker: arcs read as energy when their brightness isn't steady.
    if (material) material.visibility = rand(0.55, 1);
  });

  let alive = true;
  const crackle: ItemCrackle = {
    position,
    get alive() {
      return alive;
    },
    stop() {
      this.dispose();
    },
    dispose: () => {
      if (!alive) return;
      alive = false;
      liveCrackles.delete(crackle);
      scene.onBeforeRenderObservable.remove(observer);
      (scene as TestScene).look?.glow.unReferenceMeshFromUsingItsOwnMaterial(
        mesh
      );
      // The shared empty-colours texture must survive this — see greasedLineRelease.ts.
      releaseGreasedLineMaterial(mesh);
      mesh.dispose();
    },
  };
  liveCrackles.add(crackle);
  return crackle;
}

function spawn(scene: Scene, at: Vector3, opts: ItemCrackleOptions): EffectHandle {
  return createItemCrackle(scene, opts.tier, opts.kind, at.x, at.y, at.z) ?? DEAD_HANDLE;
}

function reset(): void {
  for (const c of Array.from(liveCrackles)) c.dispose();
  liveCrackles.clear();
}

// ---- 3. the layer ----------------------------------------------------------

/** No update: each crackle steps itself from a render observer. */
export const itemCrackleLayer: EffectLayer<ItemCrackleOptions, 'itemCrackle'> = {
  name: 'itemCrackle',
  reset,
  spawn,
};
