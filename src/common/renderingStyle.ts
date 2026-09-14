import type { Effect } from '../libs/babylon/exports';
import { GameOptions } from './gameOptions';
import { lightingTier } from './lightingQuality';
import { devQueryNumber, devQueryNumbers } from './devSeams';
import type { TextKey } from '../i18n';

/**
 * Rendering style (rendering_style ARCHITECTURE): 0 is the frame as it is,
 * 1 steps the sun's response on every lit model, 2 adds a stepped rim on the
 * figures and the ink outline (scenes/inkOutline.ts). Live on lighting tiers
 * >= 1 only: on Classic every reader here answers "off", so no define,
 * uniform or pass exists and the frame is untouched.
 *
 * Dev seams: `?style=` replaces the option, `?shadeSteps=` the band count,
 * `?toonSoft=` the band edge width in pixels, `?toonRim=strength,edge`.
 */
export const RENDERING_STYLE_LABEL_KEYS: readonly TextKey[] = [
  'options.style.classic',
  'options.style.cel',
  'options.style.anime',
];

export const RENDERING_STYLE_MAX = RENDERING_STYLE_LABEL_KEYS.length - 1;

export type RenderingStyle = {
  /** Stepped sun on every lit model (the `MU_TOON` define). */
  readonly ramp: boolean;
  /** Stepped rim on the figures, in sun units; 0 draws none. */
  readonly rim: number;
  /** The screen-space ink outline pass. */
  readonly outline: boolean;
};

export const RENDERING_STYLES: readonly (RenderingStyle | null)[] = [
  null,
  { ramp: true, rim: 0, outline: false },
  { ramp: true, rim: 0.5, outline: true },
];

export const SHADE_STEPS_MIN = 2;
export const SHADE_STEPS_MAX = 4;
export const OUTLINE_STRENGTH_MAX = 9;

/** Band edge width in screen pixels (fwidth units); 0 is a hard edge. */
const TOON_EDGE_SOFTNESS = 1;

/** Where the stepped rim switches on, in `(1 - N.V) x lit` units. */
const TOON_RIM_EDGE = 0.6;

const styleDev = devQueryNumber('style');
const stepsDev = devQueryNumber('shadeSteps');
const softDev = devQueryNumber('toonSoft');
const rimDev = devQueryNumbers('toonRim', 2);

const clamp = (value: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, value));

export function styleIndex(): number {
  return clamp(
    Math.round(styleDev ?? GameOptions.renderingStyle),
    0,
    RENDERING_STYLE_MAX
  );
}

/** The live style; null on Classic whatever the option says. */
export function renderingStyle(): RenderingStyle | null {
  if (lightingTier() === null) return null;

  return RENDERING_STYLES[styleIndex()] ?? null;
}

export function shadeSteps(): number {
  return clamp(
    Math.round(stepsDev ?? GameOptions.shadeSteps),
    SHADE_STEPS_MIN,
    SHADE_STEPS_MAX
  );
}

/** The slider as stored, 0..9; 0 means no pass is built. */
export function outlineStrength(): number {
  return clamp(Math.round(GameOptions.outlineStrength), 0, OUTLINE_STRENGTH_MAX);
}

/** vec4: x bands, y band edge softness (px), z rim strength, w rim edge. */
export const TOON_UNIFORM = 'muToon';

/**
 * vec2: x the key's level (the lit sum on an up face in the open), y the
 * floor under it as a share (the sky's ground term). The item material binds
 * it from the rig; the bands span the two.
 */
export const TOON_REF_UNIFORM = 'muToonRef';

/**
 * What the item materials bind, per draw. The director refreshes it once a
 * tick (`syncRenderingStyle`), so the compile-time bit and the uniform can
 * never disagree and a bind reads no option.
 */
const toon = {
  active: false,
  bands: 3,
  soft: TOON_EDGE_SOFTNESS,
  rim: 0,
  rimEdge: TOON_RIM_EDGE,
};

export function syncRenderingStyle(): void {
  const style = renderingStyle();

  toon.active = style?.ramp === true;
  toon.bands = shadeSteps();
  toon.soft = softDev ?? TOON_EDGE_SOFTNESS;
  toon.rim = rimDev?.[0] ?? style?.rim ?? 0;
  toon.rimEdge = rimDev?.[1] ?? TOON_RIM_EDGE;
}

// Materials can compile before the director's first tick.
syncRenderingStyle();

/** True while the lit materials compile the stepped sun. */
export function toonRampActive(): boolean {
  return toon.active;
}

/** Per draw. The rim is the figures' own; a prop takes the ramp alone. */
export function bindToon(effect: Effect, characterAsset: boolean): void {
  if (!toon.active) return;

  effect.setFloat4(
    TOON_UNIFORM,
    toon.bands,
    toon.soft,
    characterAsset ? toon.rim : 0,
    toon.rimEdge
  );
}

/**
 * The band and threshold helpers, compiled under `MU_TOON`. Both ease their
 * edge over `soft` pixels of screen-space change (fwidth), so a band boundary
 * is one antialiased line; they must be called from uniform control flow.
 */
export function toonFunctionsGlsl(): string {
  return `
  #ifdef MU_TOON
  // Nearest of \`bands\` levels over [0, 1]. The edge width is capped at half
  // a band so the ramp stays continuous where floor() steps.
  float muToonBands(float x, float bands, float soft) {
    float s = max(bands - 1.0, 1.0);
    float v = clamp(x, 0.0, 1.0) * s;
    float i = floor(v);
    float w = clamp(fwidth(v) * soft, 1e-4, 0.5);
    return (i + smoothstep(0.5 - w, 0.5 + w, v - i)) / s;
  }

  float muToonStep(float x, float edge, float soft) {
    float w = max(fwidth(x) * soft, 1e-4);
    return smoothstep(edge - w, edge + w, x);
  }
  #endif
`;
}
