import type { Effect } from '../libs/babylon/exports';
import { GameOptions } from './gameOptions';
import { lightingTier, tierIndex } from './lightingQuality';
import { devQueryNumber, devQueryNumbers } from './devSeams';
import type { TextKey } from '../i18n';

/**
 * Rendering style (rendering_style ARCHITECTURE): 0 is the frame as it is,
 * 1 steps the sun's response on every lit model, 2 (Anime 1.0) adds the ink
 * outline (scenes/inkOutline.ts), a stepped rim on the figures, flat tones
 * on the textures and, behind their own toggles, an ink outline on the
 * grass blades (`grassOutline`) and flat, contoured skill effects
 * (`animeEffects`). On the Ultra tier Anime 1.0 also draws a hard highlight
 * on the figures and hatches the darkest band (`MU_TOON_ULTRA`).
 * Live on lighting tiers >= 1 only: on Classic every reader here answers
 * "off", so no define, uniform or pass exists and the frame is untouched.
 *
 * 3 (Anime 2.0, ARCHITECTURE 2.6) is the same machinery with every part of
 * it on its own control instead of the one dial, plus a view-locked matcap
 * sheen (`MU_TOON_SHEEN`), a manga screentone (`MU_TOON_TONE`), a choice
 * between the screen-space lines and an inverted hull, radial speed lines
 * and a cinematic trim. Anime 1.0 never reads a 2.0 slider: every live
 * reader below consults them only while the style says `tuned`.
 *
 * `styleStrength` (1..9) is Anime 1.0's dial on how far it goes: flatter
 * textures, a stronger rim. The ink lines have three sliders of their own,
 * `lineStrength` (1..9, how dark), `lineWidth` (1..5 texels) and
 * `linePlacement` (which side of a silhouette the line sits on); the grass
 * outline and the effect contours follow the first two, and both anime
 * styles use them.
 *
 * Dev seams: `?style=` replaces the option, `?strength=` the dial,
 * `?lineStrength=` the darkness, `?lineWidth=` the width,
 * `?linePlacement=` the side,
 * `?shadeSteps=` the band count, `?toonSoft=` the band edge width in
 * pixels, `?toonRim=strength,edge`, `?toonTex=bias,levels`,
 * `?toonGrass=darkness,start`, `?grassOutline=0|1`, `?animeEffects=0|1`,
 * `?toonUltra=glint,hatch`, and one per 2.0 slider: `?animeShading=`,
 * `?animeRim=`, `?animeRimWidth=`, `?animeMatcap=`, `?animePaint=`,
 * `?animeHalftone=`, `?animeHalftoneScale=`, `?animeOutline=`,
 * `?animeSpeedLines=`, `?animeFilm=`, `?animeImpacts=0|1`.
 */
export const RENDERING_STYLE_LABEL_KEYS: readonly TextKey[] = [
  'options.style.classic',
  'options.style.cel',
  'options.style.anime',
  'options.style.anime2',
];

export const RENDERING_STYLE_MAX = RENDERING_STYLE_LABEL_KEYS.length - 1;

export type RenderingStyle = {
  /** Stepped sun on every lit model (the `MU_TOON` define). */
  readonly ramp: boolean;
  /** Stepped rim on the figures, in sun units at mid strength; 0 draws none. */
  readonly rim: number;
  /** The outline is reachable: the ink pass, the hull, or both. */
  readonly outline: boolean;
  /** Flat tones on the textures (`MU_TOON_FLAT`) are reachable. */
  readonly flat: boolean;
  /** The Ultra tier's extras: the highlight and the hatching (`MU_TOON_ULTRA`). */
  readonly extras: boolean;
  /** The one Style strength dial drives the look (Anime 1.0's alone). */
  readonly dialled: boolean;
  /** Anime 2.0's per-part rig drives the look instead of the dial. */
  readonly tuned: boolean;
};

export const RENDERING_STYLES: readonly (RenderingStyle | null)[] = [
  null,
  {
    ramp: true,
    rim: 0,
    outline: false,
    flat: false,
    extras: false,
    dialled: false,
    tuned: false,
  },
  {
    ramp: true,
    rim: 1,
    outline: true,
    flat: true,
    extras: true,
    dialled: true,
    tuned: false,
  },
  // 2.0's `outline` and `flat` are capabilities, so their rows stay
  // reachable; what is drawn comes from Outline mode and Painterly, and
  // either at 0 compiles no define and builds no pass. `extras` is false
  // because the matcap and the screentone supersede the Ultra pair and run
  // on Enhanced too.
  {
    ramp: true,
    rim: 1,
    outline: true,
    flat: true,
    extras: false,
    dialled: false,
    tuned: true,
  },
];

export const SHADE_STEPS_MIN = 2;
export const SHADE_STEPS_MAX = 4;
export const STYLE_STRENGTH_MIN = 1;
export const STYLE_STRENGTH_MAX = 9;
export const LINE_WIDTH_MIN = 1;
export const LINE_WIDTH_MAX = 5;
export const LINE_STRENGTH_MIN = 1;
export const LINE_STRENGTH_MAX = 9;

/**
 * Where a line sits on a silhouette. Inside it, the line eats into the thing
 * it draws, which is what a near-side-only test gives and what makes a wide
 * line trim a wing or a blade. Across it, half the width lands on each side.
 * Outside it, the thing keeps its whole shape and the line lies on whatever
 * stands behind.
 */
export const LINE_PLACEMENT_LABEL_KEYS: readonly TextKey[] = [
  'options.linePlacement.inset',
  'options.linePlacement.centered',
  'options.linePlacement.outset',
];

export const LINE_PLACEMENT_MAX = LINE_PLACEMENT_LABEL_KEYS.length - 1;

/**
 * Which outline Anime 2.0 draws. Bit 1 is the screen-space ink pass, bit 2
 * the inverted hull, so `Both` is the pair and `Off` is neither.
 */
export const OUTLINE_MODE_LABEL_KEYS: readonly TextKey[] = [
  'common.off',
  'options.outlineMode.screen',
  'options.outlineMode.hull',
  'options.outlineMode.both',
];

export const OUTLINE_MODE_MAX = OUTLINE_MODE_LABEL_KEYS.length - 1;

const OUTLINE_SCREEN_BIT = 1;
const OUTLINE_HULL_BIT = 2;

/** Anime 2.0's sliders, all 0..9 but the dot scale, which starts at 1. */
export const ANIME_SLIDER_MAX = 9;
export const ANIME_HALFTONE_SCALE_MIN = 1;
export const ANIME_HALFTONE_SCALE_MAX = 9;

/** What the pass wants: 1 inside the silhouette, 0 across it, -1 outside. */
const LINE_SIDES: readonly number[] = [1, 0, -1];

/** Ink darkness per step of the line strength: 0.2 at the bottom, black at the top. */
const INK_DARKNESS_STEP = 0.1;

/** Band edge width in screen pixels (fwidth units); 0 is a hard edge. */
const TOON_EDGE_SOFTNESS = 1;

/** Where the stepped rim switches on, in `(1 - N.V) x lit` units. */
const TOON_RIM_EDGE = 0.45;

/** Where the grass outline starts to show along the blade, root 0 to tip 1. */
const GRASS_INK_START = 0.2;

/** Frame height at which one ink texel is one pixel (the ink pass's rule). */
const REFERENCE_HEIGHT = 900;

/** The Ultra highlight: its strength in sun units, and its Blinn exponent. */
const ULTRA_GLINT = 1;
const ULTRA_GLINT_POWER = 32;

/**
 * The Ultra hatching: the share of the darkest band's light it takes, and
 * its period in pixels at the reference height.
 */
const ULTRA_HATCH = 0.6;
const ULTRA_HATCH_PERIOD = 5;

/**
 * Anime 2.0's mappings from its sliders onto what the shaders want. The
 * shading grade is the band edge in screen pixels, hard at the top of the
 * slider; the rim edge runs the other way, so a high Rim width is a broad
 * wash and a low one a thin line.
 */
const SHADING_SOFT_PER_STEP = 0.4;
const RIM_PER_STEP = 1 / 5;
const RIM_EDGE_TOP = 0.75;
const RIM_EDGE_PER_STEP = 0.05;
const PAINT_BIAS_BASE = 0.4;
const PAINT_BIAS_PER_STEP = 0.18;
const PAINT_LEVELS_TOP = 9;
const PAINT_LEVELS_PER_STEP = 0.55;

/**
 * The matcap lobe's tightness, and the share of the stepped light a
 * screentone dot takes. A tighter lobe than 2 leaves only a pinprick of the
 * view sphere above the step and the sheen never shows up on a body.
 */
const SHEEN_POWER = 2;
const HALFTONE_MAX = 0.7;

/** What the Cinematic slider adds to the player's own three at its top notch. */
const FILM_BLOOM = 4;
const FILM_CHROMATIC = 3;
const FILM_GRAIN = 3;

const styleDev = devQueryNumber('style');
const strengthDev = devQueryNumber('strength');
const widthDev = devQueryNumber('lineWidth');
const lineStrengthDev = devQueryNumber('lineStrength');
const placementDev = devQueryNumber('linePlacement');
const stepsDev = devQueryNumber('shadeSteps');
const softDev = devQueryNumber('toonSoft');
const rimDev = devQueryNumbers('toonRim', 2);
const texDev = devQueryNumbers('toonTex', 2);
const grassDev = devQueryNumbers('toonGrass', 2);
const grassOutlineDev = devQueryNumber('grassOutline');
const animeEffectsDev = devQueryNumber('animeEffects');
const ultraDev = devQueryNumbers('toonUltra', 2);
const shadingDev = devQueryNumber('animeShading');
const animeRimDev = devQueryNumber('animeRim');
const animeRimWidthDev = devQueryNumber('animeRimWidth');
const matcapDev = devQueryNumber('animeMatcap');
const paintDev = devQueryNumber('animePaint');
const halftoneDev = devQueryNumber('animeHalftone');
const halftoneScaleDev = devQueryNumber('animeHalftoneScale');
const outlineModeDev = devQueryNumber('animeOutline');
const speedLinesDev = devQueryNumber('animeSpeedLines');
const filmDev = devQueryNumber('animeFilm');
const impactsDev = devQueryNumber('animeImpacts');

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

/** The grass outline toggle as stored. */
export function grassOutline(): boolean {
  return grassOutlineDev !== null
    ? grassOutlineDev !== 0
    : GameOptions.grassOutline;
}

/** The skill effects toggle as stored. */
export function animeEffects(): boolean {
  return animeEffectsDev !== null
    ? animeEffectsDev !== 0
    : GameOptions.animeEffects;
}

/** The line placement as stored, 0..2. */
export function linePlacement(): number {
  return clamp(
    Math.round(placementDev ?? GameOptions.linePlacement),
    0,
    LINE_PLACEMENT_MAX
  );
}

/** True while Anime 2.0's own rig is the one driving the look. */
export function styleTuned(): boolean {
  return renderingStyle()?.tuned === true;
}

const animeSlider = (dev: number | null, stored: number): number =>
  clamp(Math.round(dev ?? stored), 0, ANIME_SLIDER_MAX);

/** Anime 2.0's sliders as stored. Read only while the style is `tuned`. */
export function animeShading(): number {
  return animeSlider(shadingDev, GameOptions.animeShading);
}

export function animeRim(): number {
  return animeSlider(animeRimDev, GameOptions.animeRim);
}

export function animeRimWidth(): number {
  return animeSlider(animeRimWidthDev, GameOptions.animeRimWidth);
}

export function animeMatcap(): number {
  return animeSlider(matcapDev, GameOptions.animeMatcap);
}

export function animePaint(): number {
  return animeSlider(paintDev, GameOptions.animePaint);
}

export function animeHalftone(): number {
  return animeSlider(halftoneDev, GameOptions.animeHalftone);
}

export function animeHalftoneScale(): number {
  return clamp(
    Math.round(halftoneScaleDev ?? GameOptions.animeHalftoneScale),
    ANIME_HALFTONE_SCALE_MIN,
    ANIME_HALFTONE_SCALE_MAX
  );
}

export function animeOutlineMode(): number {
  return clamp(
    Math.round(outlineModeDev ?? GameOptions.animeOutlineMode),
    0,
    OUTLINE_MODE_MAX
  );
}

export function animeSpeedLines(): number {
  return animeSlider(speedLinesDev, GameOptions.animeSpeedLines);
}

export function animeFilm(): number {
  return animeSlider(filmDev, GameOptions.animeFilm);
}

export function animeImpacts(): boolean {
  return impactsDev !== null ? impactsDev !== 0 : GameOptions.animeImpacts;
}

/**
 * The screen-space ink pass: every style that draws lines wants it, except
 * a tuned style whose Outline mode left it out.
 */
export function inkLinesActive(): boolean {
  const style = renderingStyle();

  if (style?.outline !== true) return false;

  return (
    !style.tuned || (animeOutlineMode() & OUTLINE_SCREEN_BIT) !== 0
  );
}

/** The inverted hull on the figures; Anime 2.0's alone. */
export function hullOutlineActive(): boolean {
  const style = renderingStyle();

  return (
    style?.outline === true &&
    style.tuned &&
    (animeOutlineMode() & OUTLINE_HULL_BIT) !== 0
  );
}

/** The speed-line pass's strength at full travel, 0 while it is off. */
export function speedLineStrength(): number {
  return styleTuned() ? animeSpeedLines() / ANIME_SLIDER_MAX : 0;
}

/**
 * What the Cinematic slider adds to the player's own bloom, chromatic
 * aberration and film grain. The post chain stays the only writer of the
 * pipeline; this is one more input to it, live on Anime 2.0 alone.
 */
export function animeFilmBoost(): {
  bloom: number;
  chromatic: number;
  grain: number;
} {
  const t = styleTuned() ? animeFilm() / ANIME_SLIDER_MAX : 0;

  return {
    bloom: FILM_BLOOM * t,
    chromatic: FILM_CHROMATIC * t,
    grain: FILM_GRAIN * t,
  };
}

/** vec4: x bands, y band edge softness (px), z rim strength, w rim edge. */
export const TOON_UNIFORM = 'muToon';

/**
 * vec4, Ultra only: x highlight strength (sun units, 0 on a prop), y its
 * exponent, z hatch strength, w hatch period in pixels.
 */
export const TOON_ULTRA_UNIFORM = 'muToonUltra';

/**
 * vec2: x the key's level (the lit sum on an up face in the open), y the
 * floor under it as a share (the sky's ground term). The item material binds
 * it from the rig; the bands span the two.
 */
export const TOON_REF_UNIFORM = 'muToonRef';

/**
 * vec4: x the mip bias on the art, y its tone levels, z the grass outline's
 * darkness, w its width in pixels. Bound by the item materials and by the
 * ground's light binder (terrainLighting.ts) alike.
 */
export const TOON_FILTER_UNIFORM = 'muToonFilter';

/**
 * vec4, Anime 2.0 only: x the matcap's strength, y its tightness, z the
 * screentone's strength, w its dot period in pixels. One uniform for two
 * defines, bound whenever either is live.
 */
export const TOON_SHEEN_UNIFORM = 'muToonSheen';

/**
 * The camera's right and up in world space, for the matcap. A matcap is a
 * function of the normal *as seen*, so the shader needs the view's basis and
 * nothing else; the director hands them over once a tick rather than the
 * fragment reading a view matrix.
 */
export const TOON_CAM_X_UNIFORM = 'muToonCamX';
export const TOON_CAM_Y_UNIFORM = 'muToonCamY';

/**
 * What the materials bind, per draw. The director refreshes it once a tick
 * (`syncRenderingStyle`), so the compile-time bits and the uniforms can
 * never disagree and a bind reads no option.
 */
const toon = {
  active: false,
  flat: false,
  grass: false,
  effects: false,
  ultra: false,
  sheen: false,
  tone: false,
  bands: 3,
  soft: TOON_EDGE_SOFTNESS,
  rim: 0,
  rimEdge: TOON_RIM_EDGE,
  inkDarkness: 0.6,
  inkWidth: 2,
  inkSide: 0,
  /** One ink texel in pixels at the current frame height. */
  inkPixel: 1,
  texBias: 1.25,
  texLevels: 7,
  grassInk: 0.6,
  grassStart: GRASS_INK_START,
  glint: ULTRA_GLINT,
  glintPower: ULTRA_GLINT_POWER,
  hatch: ULTRA_HATCH,
  hatchPeriod: ULTRA_HATCH_PERIOD,
  matcap: 0,
  matcapPower: SHEEN_POWER,
  halftone: 0,
  halftonePeriod: ANIME_HALFTONE_SCALE_MIN,
  /** The camera's basis for the matcap; identity until the director ticks. */
  camX: [1, 0, 0] as [number, number, number],
  camY: [0, 1, 0] as [number, number, number],
};

/**
 * `frameHeight` is the backbuffer's, so the grass outline and the hatching
 * scale the way the ink lines do (one texel at 900 px, two at twice it).
 */
export function syncRenderingStyle(
  frameHeight = REFERENCE_HEIGHT,
  camX?: readonly [number, number, number],
  camY?: readonly [number, number, number]
): void {
  const style = renderingStyle();
  const tuned = style?.tuned === true;
  // 0 at the bottom of the dial, 1 at the top.
  const t = (styleStrength() - STYLE_STRENGTH_MIN) / (STYLE_STRENGTH_MAX - STYLE_STRENGTH_MIN);
  const pixel = Math.max(1, Math.round(frameHeight / REFERENCE_HEIGHT));
  const paint = tuned ? animePaint() : 0;
  const lines = inkLinesActive();

  toon.active = style?.ramp === true;
  toon.flat = style?.flat === true && (!tuned || paint > 0);
  toon.grass = lines && grassOutline();
  toon.effects = lines && animeEffects();
  toon.ultra = style?.extras === true && tierIndex() >= 2;
  toon.sheen = tuned && animeMatcap() > 0;
  toon.tone = tuned && animeHalftone() > 0;
  toon.bands = shadeSteps();
  toon.soft =
    softDev ??
    (tuned
      ? (ANIME_SLIDER_MAX - animeShading()) * SHADING_SOFT_PER_STEP
      : TOON_EDGE_SOFTNESS);
  toon.rim =
    rimDev?.[0] ??
    (tuned ? animeRim() * RIM_PER_STEP : (style?.rim ?? 0) * (0.5 + t));
  toon.rimEdge =
    rimDev?.[1] ??
    (tuned
      ? RIM_EDGE_TOP - animeRimWidth() * RIM_EDGE_PER_STEP
      : TOON_RIM_EDGE);
  toon.inkDarkness = (lineStrength() + 1) * INK_DARKNESS_STEP;
  toon.inkWidth = lineWidth();
  toon.inkSide = LINE_SIDES[linePlacement()] ?? 0;
  toon.inkPixel = pixel;
  toon.texBias =
    texDev?.[0] ??
    (tuned ? PAINT_BIAS_BASE + PAINT_BIAS_PER_STEP * paint : 0.5 + 1.5 * t);
  toon.texLevels =
    texDev?.[1] ??
    (tuned
      ? Math.round(PAINT_LEVELS_TOP - PAINT_LEVELS_PER_STEP * paint)
      : Math.round(9 - 4 * t));
  toon.grassInk = grassDev?.[0] ?? toon.inkDarkness;
  toon.grassStart = grassDev?.[1] ?? GRASS_INK_START;
  toon.glint = ultraDev?.[0] ?? ULTRA_GLINT;
  toon.glintPower = ULTRA_GLINT_POWER;
  toon.hatch = ultraDev?.[1] ?? ULTRA_HATCH;
  toon.hatchPeriod = ULTRA_HATCH_PERIOD * pixel;
  toon.matcap = toon.sheen ? animeMatcap() / ANIME_SLIDER_MAX : 0;
  toon.matcapPower = SHEEN_POWER;
  toon.halftone = toon.tone
    ? (animeHalftone() / ANIME_SLIDER_MAX) * HALFTONE_MAX
    : 0;
  toon.halftonePeriod = animeHalftoneScale() * pixel;

  if (camX) toon.camX = [camX[0], camX[1], camX[2]];
  if (camY) toon.camY = [camY[0], camY[1], camY[2]];
}

// Materials can compile before the director's first tick.
syncRenderingStyle();

/** True while the lit materials compile the stepped sun. */
export function toonRampActive(): boolean {
  return toon.active;
}

/** True while the textures compile flat tones. */
export function toonFlatActive(): boolean {
  return toon.flat;
}

/** True while the grass blades compile their outline. */
export function toonGrassActive(): boolean {
  return toon.grass;
}

/** True while the ink pass flattens and contours the effects. */
export function toonEffectsActive(): boolean {
  return toon.effects;
}

/** True while the lit materials compile the Ultra extras. */
export function toonUltraActive(): boolean {
  return toon.ultra;
}

/** True while the figures compile the view-locked matcap sheen. */
export function toonSheenActive(): boolean {
  return toon.sheen;
}

/** True while the lit materials compile the screentone. */
export function toonToneActive(): boolean {
  return toon.tone;
}

/** The band count the snapshot holds, for the passes. */
export function toonBands(): number {
  return toon.bands;
}

/** Where the grass outline starts along the blade, root 0 to tip 1, for the shader text. */
export function grassInkStart(): number {
  return toon.grassStart;
}

/** How dark the ink lines are, 0..1, from its slider. */
export function inkDarkness(): number {
  return toon.inkDarkness;
}

/** How wide the ink lines are in G-buffer texels at the reference height, from its slider. */
export function inkWidth(): number {
  return toon.inkWidth;
}

/** Which side of a silhouette the lines sit on: 1 inside, 0 across, -1 outside. */
export function inkSide(): number {
  return toon.inkSide;
}

/** The ground and grass shaders' defines for the style; empty when off. */
export function toonTerrainDefines(): string[] {
  return [
    ...(toon.flat ? ['#define MU_TOON_FLAT'] : []),
    ...(toon.grass ? ['#define MU_TOON_GRASS'] : []),
  ];
}

/**
 * Per draw. The rim and the Ultra highlight are the figures' own; a prop
 * takes the ramp and the hatching alone.
 */
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

  if (toon.ultra) {
    effect.setFloat4(
      TOON_ULTRA_UNIFORM,
      characterAsset ? toon.glint : 0,
      toon.glintPower,
      toon.hatch,
      toon.hatchPeriod
    );
  }

  if (toon.sheen || toon.tone) {
    effect.setFloat4(
      TOON_SHEEN_UNIFORM,
      characterAsset ? toon.matcap : 0,
      toon.matcapPower,
      toon.halftone,
      toon.halftonePeriod
    );
  }

  if (toon.sheen) {
    effect.setFloat3(TOON_CAM_X_UNIFORM, toon.camX[0], toon.camX[1], toon.camX[2]);
    effect.setFloat3(TOON_CAM_Y_UNIFORM, toon.camY[0], toon.camY[1], toon.camY[2]);
  }

  bindToonFilter(effect);
}

/** Per draw, for anything that compiles `MU_TOON_FLAT` or `MU_TOON_GRASS`. */
export function bindToonFilter(effect: Effect): void {
  if (!toon.flat && !toon.grass) return;

  effect.setFloat4(
    TOON_FILTER_UNIFORM,
    toon.texBias,
    toon.texLevels,
    toon.grassInk,
    toon.inkWidth * toon.inkPixel
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
  #if defined(MU_TOON) || defined(MU_TOON_FLAT) || defined(MU_TOON_GRASS) || defined(MU_TOON_SHEEN) || defined(MU_TOON_TONE)
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

  #ifdef MU_TOON_SHEEN
  // The matcap: the normal as seen, on the unit disc. A stepped lobe near
  // the upper left is the key and a stepped band near the silhouette is the
  // sheen, both locked to the view, so they stay put while the figure turns
  // and while the sun moves. That is the whole of what a sphere image would
  // have carried, without the image.
  float muToonMatcap(vec3 n, vec3 camX, vec3 camY, float power, float soft) {
    vec2 p = vec2(dot(n, camX), dot(n, camY));
    float key = clamp(1.0 - length(p - vec2(-0.45, 0.45)) * 1.6, 0.0, 1.0);
    float edge = clamp(length(p), 0.0, 1.0);
    return muToonStep(pow(key, power), 0.25, soft)
      + 0.35 * muToonStep(edge, 0.82, soft) * clamp(p.y * 0.5 + 0.5, 0.0, 1.0);
  }
  #endif

  #ifdef MU_TOON_TONE
  // A screentone: a 45 degree dot grid in screen space whose dots grow as
  // the band darkens, so it is a tone laid over the picture rather than a
  // texture on the thing. 1 inside a dot, 0 between them.
  float muToonDots(float dark, float period) {
    vec2 r = vec2(gl_FragCoord.x + gl_FragCoord.y, gl_FragCoord.y - gl_FragCoord.x)
      * 0.7071067 / max(period, 1.0);
    float d = length(fract(r) - 0.5);
    float radius = 0.5 * clamp(dark, 0.0, 1.0);
    return 1.0 - smoothstep(radius - 0.08, radius + 0.08, d);
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
