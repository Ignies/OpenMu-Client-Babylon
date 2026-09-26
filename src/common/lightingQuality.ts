import type { Camera, PostProcess, Scene } from '../libs/babylon/exports';
import { GameOptions } from './gameOptions';
import { devQuery } from './devSeams';
import type { TextKey } from '../i18n';

/**
 * Lighting quality tiers (ARCHITECTURE §6). Classic is the original look:
 * baked lightmap + projected blob shadows, no grade. Enhanced adds the
 * structured key, a cascaded shadow map on the sun, half-res SSAO and the
 * distance haze; Ultra runs the same set at full resolution with PCSS.
 */
/** The tier names, as text keys - the Options slider prints `t()` of these. */
export const LIGHTING_QUALITY_LABEL_KEYS: readonly TextKey[] = [
  'options.quality.classic',
  'options.quality.enhanced',
  'options.quality.ultra',
];

export const LIGHTING_QUALITY_MAX = LIGHTING_QUALITY_LABEL_KEYS.length - 1;

export type LightingTier = {
  readonly cascades: number;
  readonly shadowMapSize: number;
  /** Contact-hardening (PCSS) instead of the fixed PCF kernel. */
  readonly pcss: boolean;
  readonly ssaoRatio: number;
  readonly ssaoSamples: number;
};

export const LIGHTING_TIERS: readonly (LightingTier | null)[] = [
  null,
  { cascades: 3, shadowMapSize: 2048, pcss: false, ssaoRatio: 0.5, ssaoSamples: 8 },
  { cascades: 3, shadowMapSize: 4096, pcss: true, ssaoRatio: 1, ssaoSamples: 16 },
];

export function tierIndex(): number {
  return Math.max(
    0,
    Math.min(LIGHTING_QUALITY_MAX, Math.round(GameOptions.lightingQuality))
  );
}

export function lightingTier(): LightingTier | null {
  return LIGHTING_TIERS[tierIndex()];
}

/**
 * Pooled torch lights per tier - and, because every object material is
 * compiled with `2 + budget` light slots, the number of lights the forward
 * fragment shader evaluates for every pixel of every object.
 *
 * This is the single biggest knob on object shading cost: the slots run
 * whether or not the light reaches the surface (Babylon builds a mesh's
 * `lightSources` from layer masks and include/exclude lists, never from
 * range), so an unused slot is not a free slot.
 *
 * None on Classic: the original has no per-pixel lights, BodyLight already
 * carries the torch through the terrain delta (§11.5).
 */
const POINT_LIGHT_BUDGETS: readonly number[] = [0, 8, 8];

/**
 * The MSAA slider's notches. The engine is created without antialiasing
 * (`main.tsx`), so this is the only AA in the chain; Babylon clamps the
 * request to `caps.maxMSAASamples`.
 */
export const MSAA_STEPS: readonly number[] = [1, 2, 4, 8];

export const MSAA_MAX = MSAA_STEPS.length - 1;

/**
 * None on Classic whatever the slider says: the original has no AA, and a
 * linear-space resolve lifts every dark edge pixel (K1 measured +0.004 on
 * every percentile with 2 samples).
 */
export function pipelineSamples(): number {
  if (tierIndex() === 0) return 1;

  const step = Math.max(0, Math.min(MSAA_MAX, Math.round(GameOptions.msaa)));

  return MSAA_STEPS[step] ?? 4;
}

/** `?msaaHead=0`: every pass that takes these samples keeps them, first or not. */
export const MSAA_HEAD_ONLY = devQuery('msaaHead') !== '0';

/**
 * The scene is drawn into the camera's first live pass only; a pass behind it
 * writes one fullscreen quad, so multisampling its target only adds a resolve.
 */
export function sceneTargetSamples(
  camera: Pick<Camera, '_postProcesses'>,
  pass: PostProcess | null
): number {
  if (pass === null) return 1;

  for (const head of camera._postProcesses) {
    if (head) return head === pass ? pipelineSamples() : 1;
  }

  return 1;
}

let pointLightBudgetSnapshot: number | null = null;

/**
 * Snapshotted on first use. It fixes both how many `PointLight`s the scene
 * holds and the light-slot count baked into every cached object material, and
 * neither can change without rebuilding the scene - so a mid-session quality
 * change only reaches this on reload.
 */
export function pointLightBudget(): number {
  if (pointLightBudgetSnapshot === null) {
    pointLightBudgetSnapshot = POINT_LIGHT_BUDGETS[tierIndex()] ?? 8;
  }

  return pointLightBudgetSnapshot;
}

/**
 * True while the cascaded shadow map is live. The projected blob shadows
 * read as a second, wrong-direction shadow next to a CSM one, so they are
 * parked whenever this is set.
 */
export const csmState = { active: false };

/**
 * Set by `objectShadow` so the shadow owner can re-park the blob shadows
 * without importing it (objectShadow -> scenes/shadows cycle).
 */
export const blobShadowRefresh: { fn: ((scene: Scene) => void) | null } = {
  fn: null,
};

export function csmActive(): boolean {
  return csmState.active;
}

/**
 * One dial for the whole dynamic layer. Multiplies every pooled point light's
 * intensity and the floor delta the terrain shader adds, so torches, item
 * lamps, skill flashes and NPC forges all scale together while their relative
 * tuning - the `pointGain`/`floorGain` each recipe carries - stays where it
 * was set. A constant rather than an option: the layer is additive by rule.
 */
export const DYNAMIC_LIGHT_GAIN = 1;

export function dynamicLightGain(): number {
  return DYNAMIC_LIGHT_GAIN;
}
