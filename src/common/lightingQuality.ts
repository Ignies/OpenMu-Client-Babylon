import type { Scene } from '../libs/babylon/exports';
import { GameOptions } from './gameOptions';
import type { TextKey } from '../i18n';

/**
 * Lighting quality tiers. Classic is the original look: baked
 * lightmap + projected blob shadows. Enhanced adds a cascaded shadow map on
 * the sun, half-res SSAO and exponential height fog; Ultra runs the same set
 * at full resolution with a third cascade.
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
  readonly ssaoRatio: number;
  readonly ssaoSamples: number;
};

export const LIGHTING_TIERS: readonly (LightingTier | null)[] = [
  null,
  { cascades: 2, shadowMapSize: 1024, ssaoRatio: 0.5, ssaoSamples: 8 },
  { cascades: 3, shadowMapSize: 2048, ssaoRatio: 1, ssaoSamples: 16 },
];

function tierIndex(): number {
  return Math.max(
    0,
    Math.min(LIGHTING_QUALITY_MAX, Math.round(GameOptions.lightingQuality))
  );
}

export function lightingTier(): LightingTier | null {
  return LIGHTING_TIERS[tierIndex()];
}

/**
 * Pooled torch lights per tier — and, because every object material is
 * compiled with `2 + budget` light slots, the number of lights the forward
 * fragment shader evaluates for every pixel of every object.
 *
 * This is the single biggest knob on object shading cost: the slots run
 * whether or not the light reaches the surface (Babylon builds a mesh's
 * `lightSources` from layer masks and include/exclude lists, never from
 * range), so an unused slot is not a free slot. Classic gives up two of them;
 * Enhanced and Ultra keep the full set the tavern was lit with.
 *
 * Raise the Classic entry back to 8 to restore the previous behaviour exactly.
 */
const POINT_LIGHT_BUDGETS: readonly number[] = [6, 8, 8];

/**
 * MSAA sample count on the rendering pipeline's HDR target, per tier. The
 * engine itself is created without antialiasing (`main.tsx`), so this is the
 * only AA in the chain — and at 4× it is the most expensive single line in
 * the post setup on fill-rate-bound GPUs, because every pass in the chain
 * inherits the multisampled target.
 */
const PIPELINE_SAMPLE_COUNTS: readonly number[] = [2, 4, 4];

export function pipelineSamples(): number {
  return PIPELINE_SAMPLE_COUNTS[tierIndex()] ?? 4;
}

let pointLightBudgetSnapshot: number | null = null;

/**
 * Snapshotted on first use. It fixes both how many `PointLight`s the scene
 * holds and the light-slot count baked into every cached object material, and
 * neither can change without rebuilding the scene — so a mid-session quality
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
 * parked whenever this is set ("retire/blend blob shadows").
 */
export const csmState = { active: false };

/**
 * Set by `objectShadow` so the lighting module can re-park the blob shadows
 * without importing it (objectShadow → sceneLook → enhancedLighting cycle).
 */
export const blobShadowRefresh: { fn: ((scene: Scene) => void) | null } = {
  fn: null,
};

export function csmActive(): boolean {
  return csmState.active;
}

/**
 * One dial for the whole dynamic layer ("global dynamic-light
 * intensity scalar"). Multiplies every pooled point light's intensity and the
 * floor delta the terrain shader adds, so torches, item lamps, skill flashes
 * and NPC forges all scale together while their relative tuning — the
 * `pointGain`/`floorGain` each recipe carries — stays where it was set.
 *
 * 1 is the tuning every mood was authored against. It is a constant rather
 * than a `GameOptions` entry on purpose: the layer is *additive* by rule, so a
 * player-facing slider here would only ever be a way to wash out or black out
 * the art direction, and the moods already expose exposure and darkness.
 */
export const DYNAMIC_LIGHT_GAIN = 1;

/**
 * The day/night cycle's multiplier on the dynamic layer: 1 at noon, higher
 * after dark, so torches and candles carry the scene at night without any
 * recipe changing (day_night architecture, seam 4). Pushed by `sceneLook`'s
 * cycle tick — the one consumer of the clock — rather than read from the
 * cycle here, because the per-map damping lives with the mood writer.
 */
let cycleGain = 1;

export function setCycleLightGain(gain: number): void {
  cycleGain = Number.isFinite(gain) && gain > 0 ? gain : 1;
}

export function dynamicLightGain(): number {
  return DYNAMIC_LIGHT_GAIN * cycleGain;
}
