/**
 * Blur — a weapon-swing trail: a ribbon stretched between the last N
 * positions of two moving points (hilt and tip), textured with the sword
 * sheet, fading from the newest sample to the oldest. The original's
 * `CreateBlur(o, bone, …)` / `RenderBlur` (ZzzEffectBlur.cpp): it stores
 * `MAX_BLURS` past frames of a bone's two ends and draws them as one strip.
 *
 * One updatable mesh per trail; positions rewritten every frame, UVs fixed.
 * Sampled every frame for `seconds`, then it fades out as the samples age.
 *
 * Driven by: `effects.spawn('blur', …)` from the melee skill rows and from
 * `ecs/systems/weaponTrailSystem.ts` (`CreateWeaponBlur`: every swing clip,
 * the table in `common/weaponBlur.ts`), with the weapon bone pair as
 * `follow` / `base`. Read by: nobody.
 */
import { Mesh, Vector3, VertexBuffer, VertexData, type Scene } from '../libs/babylon/exports';
import type { TestScene } from '../scenes/testScene';
import {
  LiveList,
  additiveMaterial,
  fadeOut,
  type EffectBlend,
  type PointSource,
  type RGB,
} from './core';
import { RGBS, TEX } from './recipes';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Frames of history: the original keeps 10 blur slots. */
const SAMPLES = 10;

/** How long a swing is sampled: the attack clip's contact window. */
const DEFAULT_SECONDS = 0.5;

/** Tail length after sampling stops: the last samples fade over this. */
const FADE_SECONDS = 0.15;

// ---- 2. state + readers ----------------------------------------------------

export interface BlurOptions {
  /** The moving tip (weapon end). */
  follow: PointSource;
  /** The moving base (hilt / hand). Default: 0.6 tiles below the tip. */
  base?: PointSource;
  texture?: string;
  colour?: RGB;
  seconds?: number;
  /**
   * `add` (default) is `EnableAlphaBlend`; `subtract` is the
   * `EnableAlphaBlendMinus` pass RenderBlurs switches to once the owner has a
   * level — the trail darkens what is behind it instead of glowing.
   */
  blend?: EffectBlend;
  /** Stops sampling early when true (the swing clip was cut short). */
  until?: () => boolean;
}

const live = new LiveList();

/** How many trails are drawn (debug). */
export function blurCount(): number {
  return live.size;
}

const tip = new Vector3();
const hilt = new Vector3();

function spawn(scene: Scene, _at: Vector3, opts: BlurOptions): EffectHandle {
  const seconds = opts.seconds ?? DEFAULT_SECONDS;
  const material = additiveMaterial(
    scene,
    opts.texture ?? TEX.swordBlur,
    opts.colour ?? RGBS.steel,
    opts.blend ?? 'add'
  );

  const positions = new Float32Array(SAMPLES * 2 * 3);
  const uvs = new Float32Array(SAMPLES * 2 * 2);
  const indices: number[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    uvs[i * 4] = i / (SAMPLES - 1);
    uvs[i * 4 + 1] = 0;
    uvs[i * 4 + 2] = i / (SAMPLES - 1);
    uvs[i * 4 + 3] = 1;
    if (i < SAMPLES - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const mesh = new Mesh('fxBlur', scene);
  const data = new VertexData();
  data.positions = positions;
  data.uvs = uvs;
  data.indices = indices;
  data.applyToMesh(mesh, true);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.doNotSyncBoundingInfo = true;
  (scene as TestScene).look?.glow.addExcludedMesh(mesh);

  // Seed every sample at the first frame's pair so the strip has no tail to nowhere.
  opts.follow(tip);
  if (opts.base) opts.base(hilt);
  else hilt.set(tip.x, tip.y - 0.6, tip.z);
  for (let i = 0; i < SAMPLES; i++) {
    positions.set([hilt.x, hilt.y, hilt.z, tip.x, tip.y, tip.z], i * 6);
  }

  let t = 0;
  /** When sampling stopped (planned `seconds`, or earlier through `until`). */
  let endAt = seconds;
  let sampling = true;
  return live.push({
    update(dt) {
      t += dt;
      if (sampling && (t >= seconds || opts.until?.())) {
        sampling = false;
        endAt = Math.min(t, seconds);
      }
      if (t >= endAt + FADE_SECONDS) return false;
      if (sampling) {
        opts.follow(tip);
        if (opts.base) opts.base(hilt);
        else hilt.set(tip.x, tip.y - 0.6, tip.z);
        // Shift history back one slot; slot 0 is the newest.
        positions.copyWithin(6, 0, (SAMPLES - 1) * 6);
        positions[0] = hilt.x;
        positions[1] = hilt.y;
        positions[2] = hilt.z;
        positions[3] = tip.x;
        positions[4] = tip.y;
        positions[5] = tip.z;
      } else {
        // Sampling stopped: collapse the strip toward its newest edge.
        const k = 1 - (t - endAt) / FADE_SECONDS;
        for (let i = 1; i < SAMPLES; i++) {
          for (let c = 0; c < 6; c++) {
            positions[i * 6 + c] = positions[c] + (positions[i * 6 + c] - positions[c]) * k;
          }
        }
      }
      mesh.updateVerticesData(VertexBuffer.PositionKind, positions, false, false);
      // Until the sheet is in, the strip would draw as a solid wedge of the
      // tint (a subtractive one as its complement): hold it invisible.
      mesh.visibility = material.diffuseTexture
        ? fadeOut(t / (endAt + FADE_SECONDS), 0.3)
        : 0;
      return true;
    },
    release() {
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

export const blurLayer: EffectLayer<BlurOptions, 'blur'> = {
  name: 'blur',
  update,
  reset,
  spawn,
};
