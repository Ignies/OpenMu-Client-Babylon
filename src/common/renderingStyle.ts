import type { Effect } from '../libs/babylon/exports';
import { GameOptions } from './gameOptions';
import { lightingTier } from './lightingQuality';
import { devQueryNumber, devQueryNumbers } from './devSeams';
import type { TextKey } from '../i18n';

/**
 * Rendering style (rendering_style ARCHITECTURE): 0 is the frame as it is,
 * 1 steps the sun's response on every lit model, 2 adds the ink outline
 * (scenes/inkOutline.ts), a stepped rim on the figures, flat tones on the
 * textures and inked grass tips. Live on lighting tiers >= 1 only: on
 * Classic every reader here answers "off", so no define, uniform or pass
 * exists and the frame is untouched.
 *
 * `styleStrength` (1..9) is the dial on how far the Anime style goes:
 * flatter textures, a stronger rim. The ink lines have two sliders of
 * their own, `lineStrength` (1..9, how dark) and `lineWidth` (1..5
 * texels).
 *
 * Dev seams: `?style=` replaces the option, `?strength=` the dial,
 * `?lineStrength=` the darkness, `?lineWidth=` the width,
 * `?shadeSteps=` the band count, `?toonSoft=` the band edge width in
 * pixels, `?toonRim=strength,edge`, `?toonTex=bias,levels`,
 * `?toonGrass=darkness,start`.
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
  /** Stepped rim on the figures, in sun units at mid strength; 0 draws none. */
  readonly rim: number;
  /** The screen-space ink outline pass. */
  readonly outline: boolean;
  /** Flat tones on the textures and ink on the grass tips (`MU_TOON_FLAT`). */
  readonly flat: boolean;
};

export const RENDERING_STYLES: readonly (RenderingStyle | null)[] = [
  null,
  { ramp: true, rim: 0, outline: false, flat: false },
  { ramp: true, rim: 1, outline: true, flat: true },
];

export const SHADE_STEPS_MIN = 2;
export const SHADE_STEPS_MAX = 4;
export const STYLE_STRENGTH_MIN = 1;
export const STYLE_STRENGTH_MAX = 9;
export const LINE_WIDTH_MIN = 1;
export const LINE_WIDTH_MAX = 5;
export const LINE_STRENGTH_MIN = 1;
export const LINE_STRENGTH_MAX = 9;

/** Ink darkness per step of the line strength: 0.2 at the bottom, black at the top. */
const INK_DARKNESS_STEP = 0.1;

/** Band edge width in screen pixels (fwidth units); 0 is a hard edge. */
const TOON_EDGE_SOFTNESS = 1;

/** Where the stepped rim switches on, in `(1 - N.V) x lit` units. */
const TOON_RIM_EDGE = 0.45;

/** Where the grass ink starts along the blade, root 0 to tip 1. */
const GRASS_INK_START = 0.45;

const styleDev = devQueryNumber('style');
const strengthDev = devQueryNumber('strength');
const widthDev = devQueryNumber('lineWidth');
const lineStrengthDev = devQueryNumber('lineStrength');
const stepsDev = devQueryNumber('shadeSteps');
const softDev = devQueryNumber('toonSoft');
const rimDev = devQueryNumbers('toonRim', 2);
const texDev = devQueryNumbers('toonTex', 2);
const grassDev = devQueryNumbers('toonGrass', 2);

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

/** The dial as stored, 1..9. */
export function styleStrength(): number {
  return clamp(
    Math.round(strengthDev ?? GameOptions.styleStrength),
    STYLE_STRENGTH_MIN,
    STYLE_STRENGTH_MAX
  );
}

/** The ink lines' width as stored, 1..5 texels at the reference height. */
export function lineWidth(): number {
  return clamp(
    Math.round(widthDev ?? GameOptions.lineWidth),
    LINE_WIDTH_MIN,
    LINE_WIDTH_MAX
  );
}

/** The ink lines' darkness as stored, 1..9. */
export function lineStrength(): number {
  return clamp(
    Math.round(lineStrengthDev ?? GameOptions.lineStrength),
    LINE_STRENGTH_MIN,
    LINE_STRENGTH_MAX
  );
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
 * vec4: x the mip bias on the art, y its tone levels, z the grass ink
 * darkness, w where along the blade it starts. Bound by the item materials
 * and by the ground's light binder (terrainLighting.ts) alike.
 */
export const TOON_FILTER_UNIFORM = 'muToonFilter';

/**
 * What the materials bind, per draw. The director refreshes it once a tick
 * (`syncRenderingStyle`), so the compile-time bits and the uniforms can
 * never disagree and a bind reads no option.
 */
const toon = {
  active: false,
  flat: false,
  bands: 3,
  soft: TOON_EDGE_SOFTNESS,
  rim: 0,
  rimEdge: TOON_RIM_EDGE,
  inkDarkness: 0.6,
  inkWidth: 2,
  texBias: 1.25,
  texLevels: 7,
  grassInk: 0.6,
  grassStart: GRASS_INK_START,
};

export function syncRenderingStyle(): void {
  const style = renderingStyle();
  // 0 at the bottom of the dial, 1 at the top.
  const t = (styleStrength() - STYLE_STRENGTH_MIN) / (STYLE_STRENGTH_MAX - STYLE_STRENGTH_MIN);

  toon.active = style?.ramp === true;
  toon.flat = style?.flat === true;
  toon.bands = shadeSteps();
  toon.soft = softDev ?? TOON_EDGE_SOFTNESS;
  toon.rim = rimDev?.[0] ?? (style?.rim ?? 0) * (0.5 + t);
  toon.rimEdge = rimDev?.[1] ?? TOON_RIM_EDGE;
  toon.inkDarkness = (lineStrength() + 1) * INK_DARKNESS_STEP;
  toon.inkWidth = lineWidth();
  toon.texBias = texDev?.[0] ?? 0.5 + 1.5 * t;
  toon.texLevels = texDev?.[1] ?? Math.round(9 - 4 * t);
  toon.grassInk = grassDev?.[0] ?? toon.inkDarkness;
  toon.grassStart = grassDev?.[1] ?? GRASS_INK_START;
}

// Materials can compile before the director's first tick.
syncRenderingStyle();

/** True while the lit materials compile the stepped sun. */
export function toonRampActive(): boolean {
  return toon.active;
}

/** True while the textures compile flat tones and the grass its ink. */
export function toonFlatActive(): boolean {
  return toon.flat;
}

/** How dark the ink lines are, 0..1, from its slider. */
export function inkDarkness(): number {
  return toon.inkDarkness;
}

/** How wide the ink lines are in G-buffer texels at the reference height, from its slider. */
export function inkWidth(): number {
  return toon.inkWidth;
}

/** The ground and grass shaders' defines for the style; empty when off. */
export function toonTerrainDefines(): string[] {
  return toon.flat ? ['#define MU_TOON_FLAT'] : [];
}

/** Per draw. The rim is the figures' own; a prop takes the ramp alone. */
export function bindToon(effect: Effect, characterAsset: boolean): void {
  if (toon.active) {
    effect.setFloat4(
      TOON_UNIFORM,
      toon.bands,
      toon.soft,
      characterAsset ? toon.rim : 0,
      toon.rimEdge
    );
  }

  bindToonFilter(effect);
}

/** Per draw, for anything that compiles `MU_TOON_FLAT`. */
export function bindToonFilter(effect: Effect): void {
  if (!toon.flat) return;

  effect.setFloat4(
    TOON_FILTER_UNIFORM,
    toon.texBias,
    toon.texLevels,
    toon.grassInk,
    toon.grassStart
  );
}

/**
 * The band, threshold and flat-tone helpers, compiled under the style
 * defines. Each eases its edge over `soft` pixels of screen-space change
 * (fwidth), so a boundary is one antialiased line; they must be called from
 * uniform control flow.
 */
export function toonFunctionsGlsl(): string {
  return `
  #if defined(MU_TOON) || defined(MU_TOON_FLAT)
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

  #ifdef MU_TOON_FLAT
  // Flat tones: the texel's luminance snapped to a few levels, hue kept.
  vec3 muToonFlat(vec3 c, float levels) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    float q = muToonBands(l, levels, 1.0);
    return l > 1e-4 ? c * (q / l) : c;
  }
  #endif
`;
}

/**
 * The flat-tone resample of one texture, for a Standard-path hook: the art
 * read again with the mip bias and snapped to its levels. \`guard\` is the
 * define the sampler and its UV live under.
 */
export function toonTextureGlsl(
  sampler: string,
  uv: string,
  target: string,
  guard: string
): string {
  return `
  #ifdef MU_TOON_FLAT
  #ifdef ${guard}
    ${target} = muToonFlat(texture2D(${sampler}, ${uv}, ${TOON_FILTER_UNIFORM}.x).rgb, ${TOON_FILTER_UNIFORM}.y);
  #endif
  #endif
`;
}
