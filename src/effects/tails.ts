/**
 * Tails - the strip `RenderJoints` draws for a joint whose tails are known
 * when it is spawned: tail centres laid one a tick, each tail two crossed
 * faces `width` wide (the joint's local X and Z, `Tails[j][0..3]`), the
 * sheet's U per tail slot (`(NumTails - j) / (MaxTails - 1)`, 0 at the oldest
 * tail) and V across each face (ZzzEffectJoint.cpp:7087-7091, :7314-7337).
 * Space Split's rising pillars and Fire Scream's ground streaks
 * (BITMAP_JOINT_FORCE sub2 / sub7): real sheets in the world, where
 * `joint.ts` draws a camera-facing ribbon.
 *
 * One updatable mesh per spawn on the cached additive material; positions
 * are rewritten only when a tail is laid.
 *
 * Driven by: `effects.spawn('tails', ...)` from common/skillVisuals.ts.
 * Read by: nobody.
 */
import { Mesh, Vector3, VertexBuffer, VertexData, type Scene } from '../libs/babylon/exports';
import type { TestScene } from '../scenes/testScene';
import { EFFECT_RENDERING_GROUP, LiveList, WHITE, additiveMaterial, keepDepthForEffects, type RGB } from './core';
import { addEffectGlow, releaseEffectGlow } from './glow';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Vertices per tail: face one's two edges, then face two's. */
const TAIL_VERTS = 4;

// ---- 2. state + readers ----------------------------------------------------

export interface TailsOptions {
  /** Tail centres, oldest first, in tiles. Read when a tail is laid, so the caller may fill them late. */
  points: readonly Vector3[];
  /** How many of `points` are laid `t` seconds after the spawn (the original lays one a tick). */
  laid: (t: number) => number;
  /** Face one's half-axis direction (the joint's local X), unit. */
  across: Vector3;
  /** Face two's (the joint's local Z), unit. */
  across2: Vector3;
  /** Face width in tiles (the joint's `Scale`). */
  width: number;
  texture: string;
  colour?: RGB;
  /** `MaxTails`: the tail `k` from the oldest takes U = k / (maxTails - 1). */
  maxTails: number;
  seconds: number;
  /** A 0..1 brightness at `t` seconds alive (the joint's `Light`). */
  intensity?: (t: number) => number;
}

const live = new LiveList();

/** How many strips are drawn (debug). */
export function tailsCount(): number {
  return live.size;
}

function spawn(scene: Scene, _at: Vector3, opts: TailsOptions): EffectHandle {
  const tails = Math.max(2, Math.min(opts.maxTails, opts.points.length));
  const material = additiveMaterial(scene, opts.texture, opts.colour ?? WHITE);
  const half = opts.width / 2;
  const a1 = opts.across.scale(half);
  const a2 = opts.across2.scale(half);

  const positions = new Float32Array(tails * TAIL_VERTS * 3);
  const uvs = new Float32Array(tails * TAIL_VERTS * 2);
  const indices: number[] = [];
  for (let k = 0; k < tails; k++) {
    const u = k / (opts.maxTails - 1);
    uvs.set([u, 0, u, 1, u, 0, u, 1], k * TAIL_VERTS * 2);
    if (k < tails - 1) {
      for (const f of [0, 2]) {
        const a = k * TAIL_VERTS + f;
        const b = a + TAIL_VERTS;
        indices.push(a, a + 1, b + 1, a, b + 1, b);
      }
    }
  }
  const mesh = new Mesh('fxTails', scene);
  const data = new VertexData();
  data.positions = positions;
  data.uvs = uvs;
  data.indices = indices;
  data.applyToMesh(mesh, true);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.doNotSyncBoundingInfo = true;
  mesh.renderingGroupId = EFFECT_RENDERING_GROUP;
  keepDepthForEffects(scene);
  mesh.metadata = { brightMesh: true };
  mesh.visibility = 0;
  (scene as TestScene).look?.glow.addExcludedMesh(mesh);
  addEffectGlow(scene, mesh);

  /** Tails written into `positions`; the rest sit collapsed on the newest one. */
  let written = 0;
  const lay = (n: number): void => {
    for (let k = 0; k < tails; k++) {
      const p = opts.points[Math.min(k, n - 1)];
      const o = k * TAIL_VERTS * 3;
      positions[o] = p.x - a1.x;
      positions[o + 1] = p.y - a1.y;
      positions[o + 2] = p.z - a1.z;
      positions[o + 3] = p.x + a1.x;
      positions[o + 4] = p.y + a1.y;
      positions[o + 5] = p.z + a1.z;
      positions[o + 6] = p.x - a2.x;
      positions[o + 7] = p.y - a2.y;
      positions[o + 8] = p.z - a2.z;
      positions[o + 9] = p.x + a2.x;
      positions[o + 10] = p.y + a2.y;
      positions[o + 11] = p.z + a2.z;
    }
    mesh.updateVerticesData(VertexBuffer.PositionKind, positions, false, false);
    written = n;
  };

  let t = 0;
  return live.push({
    update(dt) {
      t += dt;
      if (t >= opts.seconds) return false;
      const n = Math.max(0, Math.min(tails, Math.floor(opts.laid(t))));
      if (n !== written && n > 0) lay(n);
      // One tail is a point, not a strip; until the sheet is in the strip would be a solid band of the tint.
      const ready = written > 1 && material.diffuseTexture ? 1 : 0;
      mesh.visibility = ready * (opts.intensity ? Math.max(0, Math.min(1, opts.intensity(t))) : 1);
      return true;
    },
    release() {
      releaseEffectGlow(mesh);
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

export const tailsLayer: EffectLayer<TailsOptions, 'tails'> = {
  name: 'tails',
  update,
  reset,
  spawn,
};
