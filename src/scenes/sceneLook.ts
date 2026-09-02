import {
  ColorCurves,
  DefaultRenderingPipeline,
  GlowLayer,
  ImageProcessingConfiguration,
  type AbstractMesh,
  type ArcRotateCamera,
  type Scene,
  type Texture,
} from '../libs/babylon/exports';
import {
  setKey,
  setSunDirection,
  syncSpecular,
} from '../lighting/keyRig';
import { ENUM_WORLD } from '../common/types';
import {
  GameOptions,
  GRADE_NOMINAL,
  MAP_GRADIENT_MAX,
  SATURATION_MAX,
  SATURATION_MIN,
  onGameOptionsChanged,
} from '../common/gameOptions';
import { applyMapGradient, createMapGradient } from './mapGradient';
import {
  itemEmissiveAt,
  itemGlowClock,
  type ItemVisualTier,
} from '../common/itemVisualTier';
import { improvedItemEffectsOn } from '../common/itemEffectMode';
import {
  directLightGain,
  meshTakesPbrMaps,
  pbrDetailStrength,
  setPbrKeyGain,
  pbrMaterialsOn,
  specularLightScale,
} from '../common/materialQuality';
import {
  lightingTier,
  pipelineSamples,
  setCycleLightGain,
} from '../common/lightingQuality';
import { serverNow } from '../common/serverTime';
import {
  cycleStateAt,
  parseCycleTime,
  setCycleOverride,
  type CycleState,
  type CyclePhase,
} from './dayCycle';
import { pbrMapsIfReady } from '../common/pbrMaps';
import { syncMaterialQuality } from '../common/modelLoader';
import { syncPbrDetail } from '../common/itemMaterial';
import { UNIFIED_LIGHT_MODEL, bodyLightTint } from '../common/lightModel';
import { installMaterialDebug } from './materialDebug';
import {
  NO_FOG,
  setEnhancedFog,
  syncEnhancedLighting,
  updateEnhancedLighting,
  type FogSettings,
} from './enhancedLighting';

export const LOOK_INTENSITY = 1;

const TONE_MAPPING_ENABLED = true;



const SHARPEN_MAX_EDGE_AMOUNT = 0.4;

function mapGradientStrength(): number {
  const value = Math.max(
    0,
    Math.min(MAP_GRADIENT_MAX, GameOptions.mapGradient)
  );

  return value / MAP_GRADIENT_MAX;
}

const CURVE_LIMIT = 100;

function clampCurve(value: number): number {
  return Math.max(-CURVE_LIMIT, Math.min(CURVE_LIMIT, value));
}

const GRADE_MAX = 25;

const MAX_DARKEN = 0.65;

function gradeScale(value: number): number {
  return Math.max(0, value) / GRADE_NOMINAL;
}

const GRAIN_INTENSITY = 4;

/** Slider top end; `GRAIN_INTENSITY` is what the top notch is worth. */
const GRAIN_MAX = 9;

/** GlowLayer strength at the top slider notch; the default 5/9 lands on the
 * 0.25 the layer was tuned at. */
const GLOW_MAX_INTENSITY = 0.45;

/** Chromatic aberration at the top slider notch. */
const CHROMATIC_MAX = 12;

/** Share of the key budget the sun takes on Enhanced/Ultra. */
const SHAPED_SUN_SHARE = 0.45;

export type SceneLook = {
  pipeline: DefaultRenderingPipeline;
  glow: GlowLayer;
};

type SplitTone = {
  readonly highlightsHue: number;
  readonly highlightsDensity: number;
  readonly shadowsHue: number;
  readonly shadowsDensity: number;
  readonly saturation: number;
  readonly highlightsSaturation?: number;
  readonly shadowsSaturation?: number;
};

export type SceneMood = {
  /**
   * Graded for the unified light model (lightModel.ts): objects carry the
   * bake and the terrain lands linear, which sits the raw frame ~1 stop
   * under the pre-unified look — so these run well above 1. Each map was
   * measured back to its old frame average (tools/screenshot/avg.mjs).
   */
  readonly exposure: number;
  readonly contrast: number;
  readonly splitTone: SplitTone;
  readonly sky: number;
  readonly skyDiffuse: readonly [number, number, number];
  readonly skyGround: readonly [number, number, number];
  readonly sun: number;
  readonly sunDiffuse: readonly [number, number, number];
  readonly terrainBake: readonly [number, number, number];
  readonly gradient: number;
  readonly bloomThreshold: number;
  readonly bloomWeight: number;
  readonly bloomKernel: number;
  readonly vignetteWeight: number;
  /** Exponential height fog; only drawn on Enhanced/Ultra. */
  readonly fog?: FogSettings;
};

/** Lorencia: warm dawn haze hugging the grass. */
const LORENCIA_FOG: FogSettings = {
  color: [0.82, 0.68, 0.5],
  density: 0.12,
  falloff: 1.1,
  base: -0.2,
  maxOpacity: 0.35,
};

/** Devias: cold, denser, sits higher on the snow. */
const DEVIAS_FOG: FogSettings = {
  color: [0.6, 0.7, 0.86],
  density: 0.18,
  falloff: 0.9,
  base: 0,
  maxOpacity: 0.45,
};

/** Atlans: not haze but water. Dense, cyan, and it starts at the floor. */
const ATLANS_FOG: FogSettings = {
  color: [0.16, 0.44, 0.52],
  density: 0.42,
  falloff: 0.55,
  base: -0.6,
  maxOpacity: 0.7,
};

/** Tarkan: the sandstorm's ground layer - warm, thin, sitting low. */
const TARKAN_FOG: FogSettings = {
  color: [0.86, 0.72, 0.48],
  density: 0.16,
  falloff: 1.4,
  base: -0.3,
  maxOpacity: 0.4,
};

/** Noria: a shallow green forest haze, lighter than Lorencia's dawn. */
const NORIA_FOG: FogSettings = {
  color: [0.7, 0.78, 0.62],
  density: 0.09,
  falloff: 1.2,
  base: -0.25,
  maxOpacity: 0.28,
};
const OUTDOOR_FOG: FogSettings = {
  color: [0.62, 0.66, 0.72],
  density: 0.07,
  falloff: 1.1,
  base: -0.2,
  maxOpacity: 0.25,
};

const DEFAULT_MOOD: SceneMood = {
  exposure: 2.1,
  contrast: 1.12,
  splitTone: {
    highlightsHue: 45,
    highlightsDensity: 28,
    shadowsHue: 222,
    shadowsDensity: 22,
    saturation: -6,
  },
  sky: 0.75,
  skyDiffuse: [1, 1, 1],
  skyGround: [0.6, 0.6, 0.66],
  sun: 0.25,
  sunDiffuse: [1, 1, 1],
  terrainBake: [1, 1, 1],
  gradient: 1,
  bloomThreshold: 0.85,
  bloomWeight: 0.25,
  bloomKernel: 32,
  vignetteWeight: 0.35,
  fog: OUTDOOR_FOG,
};

const INDOOR_MOOD: SceneMood = {
  exposure: 1.95,
  contrast: 1.2,
  splitTone: {
    highlightsHue: 34,
    highlightsDensity: 34,
    shadowsHue: 212,
    shadowsDensity: 30,
    saturation: -4,
  },
  sky: 0.5,
  skyDiffuse: [1, 0.86, 0.68],
  skyGround: [0.38, 0.31, 0.28],
  sun: 0.15,
  sunDiffuse: [1, 0.9, 0.78],
  terrainBake: [0.62, 0.53, 0.43],
  gradient: 1,
  bloomThreshold: 0.72,
  bloomWeight: 0.55,
  bloomKernel: 64,
  vignetteWeight: 0.9,
};

const CHARACTER_MOOD: SceneMood = {
  exposure: 2.1,
  contrast: 1.15,
  splitTone: {
    highlightsHue: 48,
    highlightsDensity: 18,
    shadowsHue: 228,
    shadowsDensity: 34,
    saturation: -8,
  },
  sky: 0.7,
  skyDiffuse: [1, 0.92, 0.8],
  skyGround: [0.48, 0.44, 0.42],
  sun: 0.25,
  sunDiffuse: [1, 0.92, 0.82],
  terrainBake: [0.95, 0.87, 0.77],
  gradient: 1,
  bloomThreshold: 0.78,
  bloomWeight: 0.4,
  bloomKernel: 64,
  vignetteWeight: 0.5,
};

const LORENCIA_MOOD: SceneMood = {
  exposure: 2.63,
  contrast: 1.2,
  splitTone: {
    highlightsHue: 32,
    highlightsDensity: 38,
    shadowsHue: 28,
    shadowsDensity: 10,
    saturation: 0,
    highlightsSaturation: 30,
    shadowsSaturation: -25,
  },
  sky: 0.64,
  skyDiffuse: [1, 0.84, 0.64],
  skyGround: [0.46, 0.37, 0.28],
  sun: 0.3,
  sunDiffuse: [1, 0.82, 0.62],
  terrainBake: [0.8, 0.68, 0.52],
  gradient: 1,
  bloomThreshold: 0.75,
  bloomWeight: 0.4,
  bloomKernel: 64,
  vignetteWeight: 0.42,
  fog: LORENCIA_FOG,
};

/**
 * Devias: the cold counterpart to LORENCIA_MOOD, and its mirror image.
 *
 * Lorencia is a warm key over a cool fill; snow is the other way round.
 * Every value below follows from one fact - the ground is the brightest
 * surface on the map, so it stops being a receiver and becomes a light:
 *
 *  - skyGround is lifted to nearly the sky colour itself (0.72/0.78/0.9
 *    against Lorencia's 0.46/0.37/0.28). That is the snow bounce, and it is
 *    what keeps faces from going black under an overcast sky.
 *  - sky takes more of the key and sun less: an overcast winter sky is a
 *    softbox, not a lamp. The sun keeps a trace of warmth so it still
 *    separates from the fill instead of dissolving into it.
 *  - terrainBake goes above 1 on blue. TerrainLight.OZJ was baked for a
 *    neutral grade and reads grey-brown at 1.0; snow wants it bright and
 *    faintly blue.
 *  - contrast drops - overcast has no hard shadow to carry it - while
 *    exposure rises, and the bloom threshold goes up with it so a white
 *    field does not bloom into mush.
 *  - Shadows get the strongest hue push on the map and lose most of their
 *    saturation: snow shadow reads blue-grey, not blue.
 *
 * DEVIAS_TAVERN_MOOD is the warm island inside this.
 */
const DEVIAS_MOOD: SceneMood = {
  exposure: 1.15,
  contrast: 1.08,
  splitTone: {
    highlightsHue: 205,
    highlightsDensity: 26,
    shadowsHue: 232,
    shadowsDensity: 38,
    saturation: -12,
    highlightsSaturation: -14,
    shadowsSaturation: -28,
  },
  sky: 0.82,
  skyDiffuse: [0.9, 0.95, 1],
  skyGround: [0.72, 0.78, 0.9],
  sun: 0.18,
  sunDiffuse: [1, 0.98, 0.94],
  terrainBake: [1.02, 1.08, 1.18],
  gradient: 1,
  bloomThreshold: 0.88,
  bloomWeight: 0.3,
  bloomKernel: 48,
  vignetteWeight: 0.3,
  fog: DEVIAS_FOG,
};

/**
 * Dungeon: the only map whose darkness is authored rather than graded.
 *
 * The original has no fog, no clear-colour override and no camera change here
 * (nothing in the C++ mentions WD_1DUNGEON outside audio) - the black comes
 * from the baked TerrainLight.OZJ and the 120 torches, which are the only
 * things adding light back: CreateFire writes a range-4 terrain light every
 * frame (ZzzObject.cpp:3838-3843).
 *
 * So this mood must not darken. 'darkness belongs to the lights,
 * not the grade' was written about exactly this trap - the first indoor mood
 * stacked both and went black. The key lights drop almost to nothing and the
 * contrast carries the rest, which is what lets the torches read as the light
 * sources they are. No fog: the corridors already end in geometry, so fog
 * here would be hiding a framing problem rather than solving one.
 */
const DUNGEON_MOOD: SceneMood = {
  exposure: 1.85,
  contrast: 1.34,
  splitTone: {
    highlightsHue: 30,
    highlightsDensity: 34,
    shadowsHue: 196,
    shadowsDensity: 34,
    saturation: -10,
    highlightsSaturation: 20,
    shadowsSaturation: -34,
  },
  sky: 0.3,
  skyDiffuse: [0.72, 0.78, 0.88],
  skyGround: [0.2, 0.19, 0.2],
  sun: 0.08,
  sunDiffuse: [1, 0.86, 0.66],
  terrainBake: [0.72, 0.66, 0.6],
  gradient: 1,
  bloomThreshold: 0.68,
  bloomWeight: 0.5,
  bloomKernel: 64,
  vignetteWeight: 1,
};

/**
 * Noria: the elf village - green, bright, and lit blue.
 *
 * The one thing that has to survive the grade is the lamp colour. Noria's
 * lanterns are the only cool light sources in the game's first four maps:
 * every one of them spawns Light = (L*0.4, L*0.7, L*1.0)
 * (ZzzObject.cpp:2830-2860), a hard blue-white against warm daylight. So the
 * highlights stay warm and gain saturation while the shadows go green-blue -
 * the lamps land in the shadow half of the split and read as cold.
 *
 * The original adds no terrain light at all here (there is no AddTerrainLight
 * anywhere in Noria), so unlike Lorencia the ground gets none of that back
 * and the bake has to carry the foliage on its own.
 */
const NORIA_MOOD: SceneMood = {
  exposure: 2.59,
  contrast: 1.14,
  splitTone: {
    highlightsHue: 52,
    highlightsDensity: 30,
    shadowsHue: 168,
    shadowsDensity: 26,
    saturation: 4,
    highlightsSaturation: 22,
    shadowsSaturation: -10,
  },
  sky: 0.7,
  skyDiffuse: [0.96, 1, 0.92],
  skyGround: [0.5, 0.56, 0.42],
  sun: 0.3,
  sunDiffuse: [1, 0.96, 0.82],
  terrainBake: [0.94, 1, 0.86],
  gradient: 1,
  bloomThreshold: 0.78,
  bloomWeight: 0.38,
  bloomKernel: 64,
  vignetteWeight: 0.38,
  fog: NORIA_FOG,
};

/**
 * Lost Tower: cold stone under a dead sky, with two coloured machines in it.
 *
 * Types 19 and 20 are the same tower machine in a red and a blue variant, and
 * the original hands them opposite sprite colours - (L, 0.2L, 0) against
 * (0.4L, 0.8L, L) (ZzzObject.cpp:2896-2905). A grade that pushed either hue
 * would collapse that pair, so the split-tone here is nearly hue-neutral and
 * does its work with saturation instead: drained highlights, violet shadows.
 * Everything else on the map is grey re_0* stone and bone, which has no
 * colour left to lose.
 */
const LOST_TOWER_MOOD: SceneMood = {
  exposure: 1.95,
  contrast: 1.26,
  splitTone: {
    highlightsHue: 240,
    highlightsDensity: 12,
    shadowsHue: 262,
    shadowsDensity: 30,
    saturation: -16,
    highlightsSaturation: -20,
    shadowsSaturation: -18,
  },
  sky: 0.52,
  skyDiffuse: [0.86, 0.86, 0.98],
  skyGround: [0.34, 0.33, 0.4],
  sun: 0.16,
  sunDiffuse: [0.92, 0.92, 1],
  terrainBake: [0.82, 0.82, 0.9],
  gradient: 1,
  bloomThreshold: 0.7,
  bloomWeight: 0.48,
  bloomKernel: 64,
  vignetteWeight: 0.7,
};

/**
 * Stadium: flat noon over an open arena.
 *
 * This is the one map that should not have a look. It is a duel ground - the
 * original gives it no ambient bed, no music and exactly two lines of
 * world-specific code - and anything that tints it costs the players
 * legibility of each other. So: a neutral split-tone, the highest sun share
 * of any map, the weakest vignette, and the default outdoor fog left alone so
 * the stands still recede.
 */
const STADIUM_MOOD: SceneMood = {
  exposure: 2.2,
  contrast: 1.1,
  splitTone: {
    highlightsHue: 44,
    highlightsDensity: 14,
    shadowsHue: 218,
    shadowsDensity: 16,
    saturation: -2,
  },
  sky: 0.66,
  skyDiffuse: [1, 0.98, 0.94],
  skyGround: [0.54, 0.52, 0.48],
  sun: 0.38,
  sunDiffuse: [1, 0.97, 0.9],
  terrainBake: [0.98, 0.96, 0.92],
  gradient: 1,
  bloomThreshold: 0.84,
  bloomWeight: 0.26,
  bloomKernel: 48,
  vignetteWeight: 0.22,
  fog: OUTDOOR_FOG,
};

/**
 * Atlans: the map is underwater, so the fog is the mood.
 *
 * Everything else here exists to make ATLANS_FOG believable. Depth is the
 * only cue the original has - no fog, no clear colour and no camera change
 * for world 7; what sells the water there is the caustic flipbook on the
 * terrain (ZzzLodTerrain.cpp:1591) and the map's own light bake. We have
 * neither yet, so the height fog does that job and the grade is built around
 * it: red drained hard out of both ends, the ground bounce raised (light
 * scatters up through water, it does not merely fall), and the sun cut to a
 * fraction, because a sun twenty metres down is a rumour.
 *
 * A stated deviation: reaching for fog to fix
 * framing. This is not framing - it is the defining property of the map.
 */
const ATLANS_MOOD: SceneMood = {
  exposure: 2.15,
  contrast: 1.12,
  splitTone: {
    highlightsHue: 186,
    highlightsDensity: 34,
    shadowsHue: 208,
    shadowsDensity: 44,
    saturation: -8,
    highlightsSaturation: 16,
    shadowsSaturation: -22,
  },
  sky: 0.78,
  skyDiffuse: [0.62, 0.94, 1],
  skyGround: [0.24, 0.5, 0.56],
  sun: 0.14,
  sunDiffuse: [0.72, 0.96, 1],
  terrainBake: [0.72, 0.96, 1.02],
  gradient: 1,
  bloomThreshold: 0.7,
  bloomWeight: 0.5,
  bloomKernel: 64,
  vignetteWeight: 0.6,
  fog: ATLANS_FOG,
};

/**
 * Tarkan: desert glare, and the brightest exposure on any map.
 *
 * The original's signature here is a full-screen additive sandstorm - two
 * scrolling layers tinted (0.3, 0.3, 0.25) over the whole frame
 * (ZzzInterface.cpp:8465). That overlay is not built yet, so TARKAN_FOG
 * stands in for its ground half and the grade for its wash: exposure over 1,
 * contrast pulled down (a sandstorm has no blacks), and shadows warmed rather
 * than cooled, which is the part that separates a desert from a merely
 * bright map.
 *
 * The braziers (61/65/66) and the red lamps (7) are the only saturated things
 * on screen and they are already orange, so the highlights keep their
 * saturation instead of gaining any: they do not need the help, and pushing
 * it turned the sand itself orange.
 */
const TARKAN_MOOD: SceneMood = {
  exposure: 2.41,
  contrast: 1.04,
  splitTone: {
    highlightsHue: 40,
    highlightsDensity: 32,
    shadowsHue: 24,
    shadowsDensity: 22,
    saturation: -4,
    highlightsSaturation: 6,
    shadowsSaturation: -12,
  },
  sky: 0.72,
  skyDiffuse: [1, 0.94, 0.82],
  skyGround: [0.62, 0.54, 0.42],
  sun: 0.34,
  sunDiffuse: [1, 0.9, 0.72],
  terrainBake: [1.04, 0.98, 0.86],
  gradient: 1,
  bloomThreshold: 0.8,
  bloomWeight: 0.42,
  bloomKernel: 64,
  vignetteWeight: 0.3,
  fog: TARKAN_FOG,
};

/**
 * Icarus: a sky map with no ground.
 *
 * RenderTerrain is skipped outright for this world (MainScene.cpp:402), so
 * there is no floor to bounce anything - skyGround goes almost black, and
 * that single value is what makes the islands read as floating rather than
 * sitting on something. The clear colour is the original's exact
 * (3, 25, 44) / 256 and is set in loadMapIntoScene; the grade has to stay
 * dark enough not to fight it.
 *
 * No fog, deliberately: the void is the horizon here, and fogging it would
 * put a floor back under the map.
 */
const ICARUS_MOOD: SceneMood = {
  exposure: 0.95,
  contrast: 1.24,
  splitTone: {
    highlightsHue: 208,
    highlightsDensity: 30,
    shadowsHue: 232,
    shadowsDensity: 42,
    saturation: -6,
    highlightsSaturation: 10,
    shadowsSaturation: -30,
  },
  sky: 0.46,
  skyDiffuse: [0.74, 0.86, 1],
  skyGround: [0.05, 0.07, 0.12],
  sun: 0.12,
  sunDiffuse: [0.86, 0.92, 1],
  terrainBake: [0.8, 0.88, 1],
  gradient: 1,
  bloomThreshold: 0.66,
  bloomWeight: 0.55,
  bloomKernel: 64,
  vignetteWeight: 0.75,
};
const LORENCIA_TAVERN_MOOD: SceneMood = {
  exposure: 2.1,
  contrast: 1.2,
  splitTone: {
    highlightsHue: 32,
    highlightsDensity: 38,
    shadowsHue: 28,
    shadowsDensity: 10,
    saturation: 0,
    highlightsSaturation: 30,
    shadowsSaturation: -25,
  },
  sky: 0.55,
  skyDiffuse: [1, 0.78, 0.56],
  skyGround: [0.36, 0.27, 0.2],
  sun: 0.3,
  sunDiffuse: [1, 0.8, 0.6],
  terrainBake: [0.42, 0.32, 0.22],
  gradient: 1,
  bloomThreshold: 0.75,
  bloomWeight: 0.4,
  bloomKernel: 64,
  vignetteWeight: 0.45,
};

/**
 * Devias interiors (tavern / reading room): the tavern recipe inverted —
 * a warm island in the cold grade. The sky is dimmed and warmed so the
 * candle and hearth lights carry the room, the shadows keep a cool hue so
 * the snow outside the door still reads as snow.
 */
const DEVIAS_TAVERN_MOOD: SceneMood = {
  exposure: 2.0,
  contrast: 1.22,
  splitTone: {
    highlightsHue: 34,
    highlightsDensity: 36,
    shadowsHue: 215,
    shadowsDensity: 16,
    saturation: -2,
    highlightsSaturation: 28,
    shadowsSaturation: -20,
  },
  sky: 0.62,
  skyDiffuse: [1, 0.84, 0.64],
  skyGround: [0.42, 0.34, 0.28],
  sun: 0.24,
  sunDiffuse: [1, 0.86, 0.68],
  terrainBake: [0.78, 0.64, 0.48],
  gradient: 1,
  bloomThreshold: 0.74,
  bloomWeight: 0.42,
  bloomKernel: 64,
  vignetteWeight: 0.48,
};

const AREA_MOODS = {
  lorenciaTavern: LORENCIA_TAVERN_MOOD,
  deviasTavern: DEVIAS_TAVERN_MOOD,
} satisfies Record<string, SceneMood>;

export type AreaMoodName = keyof typeof AREA_MOODS;

// --- day/night cycle -------------------------------------------------------
//
// Time-of-day is a modulation *on top of* the per-map mood, never a second
// mood table: global per-phase modifiers scale and tint whatever mood the map
// resolves to, so Devias stays Devias at night and Tarkan stays Tarkan at
// dawn. The clock itself lives in `dayCycle.ts` (a pure producer); this file
// is its one consumer, because it is already the single writer of moods and
// key lights. See documentation/day_night/ARCHITECTURE.md.

/**
 * One phase's deltas over the authored mood, which is the **noon** anchor.
 * Scales default to 1 and shifts to 0 — the noon row is all identity.
 *
 * The dungeon lesson applies verbatim ("darkness belongs to the lights, not
 * the grade"): night darkens by cutting `keyScale` and the bake, exposure
 * moves only slightly. `keyScale` never drops below ~0.25 so an unlit field
 * still reads.
 */
type PhaseModifier = {
  /** On `sky` + `sun` — the key budget. */
  readonly keyScale: number;
  readonly skyTint: readonly [number, number, number];
  readonly sunTint: readonly [number, number, number];
  readonly bakeScale: number;
  readonly bakeTint: readonly [number, number, number];
  readonly exposureShift: number;
  readonly contrastShift: number;
  /** Split-tone: pull each end's hue toward a target, by a 0..1 push. */
  readonly highlightsHue: number;
  readonly highlightsPush: number;
  readonly highlightsDensityShift: number;
  readonly highlightsSaturationShift: number;
  readonly shadowsHue: number;
  readonly shadowsPush: number;
  readonly shadowsDensityShift: number;
  readonly shadowsSaturationShift: number;
  readonly saturationShift: number;
  readonly bloomThresholdShift: number;
  readonly fogTint: readonly [number, number, number];
  readonly fogDensityScale: number;
  /**
   * On the mood's map-gradient strength. The gradients are authored as the
   * map's *noon* colour cast (Lorencia's is warm amber); after dark that
   * cast fights the phase tints — khaki instead of blue night — so the dark
   * phases pull it down.
   */
  readonly gradientScale: number;
  /**
   * A full-frame multiply in the gradient pass — the one phase lever that
   * does not ride the `colorTint` option (the split-tone does, and that
   * slider defaults to 0). This is what makes night *read blue*: blue light
   * on brown ground multiplies out to olive, so the air itself must be
   * graded, the way the reference night is.
   */
  readonly sceneTint: readonly [number, number, number];
  /** On the map's authored clear colour — the sky itself. */
  readonly clearTint: readonly [number, number, number];
  /** On the GlowLayer, so emissives pop after dark. */
  readonly glowBoost: number;
};

const NOON_MODIFIER: PhaseModifier = {
  keyScale: 1,
  skyTint: [1, 1, 1],
  sunTint: [1, 1, 1],
  bakeScale: 1,
  bakeTint: [1, 1, 1],
  exposureShift: 0,
  contrastShift: 0,
  highlightsHue: 0,
  highlightsPush: 0,
  highlightsDensityShift: 0,
  highlightsSaturationShift: 0,
  shadowsHue: 0,
  shadowsPush: 0,
  shadowsDensityShift: 0,
  shadowsSaturationShift: 0,
  saturationShift: 0,
  bloomThresholdShift: 0,
  fogTint: [1, 1, 1],
  fogDensityScale: 1,
  gradientScale: 1,
  sceneTint: [1, 1, 1],
  clearTint: [1, 1, 1],
  glowBoost: 1,
};

/** Warm rose-amber wash, long soft light raking in from the east. */
const DAWN_MODIFIER: PhaseModifier = {
  ...NOON_MODIFIER,
  keyScale: 0.75,
  skyTint: [1, 0.78, 0.62],
  sunTint: [1, 0.7, 0.5],
  bakeScale: 0.85,
  bakeTint: [1, 0.86, 0.74],
  exposureShift: -0.02,
  highlightsHue: 25,
  highlightsPush: 0.5,
  highlightsDensityShift: 6,
  shadowsHue: 300,
  shadowsPush: 0.4,
  shadowsDensityShift: 6,
  bloomThresholdShift: -0.05,
  fogTint: [1, 0.85, 0.7],
  gradientScale: 0.9,
  sceneTint: [1, 0.93, 0.86],
  clearTint: [1.15, 0.9, 0.72],
};

/** Deep mauve/magenta grade, the scene noticeably darker, glows reading. */
const DUSK_MODIFIER: PhaseModifier = {
  ...NOON_MODIFIER,
  keyScale: 0.55,
  skyTint: [0.95, 0.7, 0.75],
  sunTint: [1, 0.6, 0.45],
  bakeScale: 0.65,
  bakeTint: [0.9, 0.72, 0.8],
  exposureShift: -0.05,
  highlightsHue: 320,
  highlightsPush: 0.5,
  shadowsHue: 280,
  shadowsPush: 0.5,
  shadowsDensityShift: 8,
  saturationShift: -6,
  bloomThresholdShift: -0.08,
  fogTint: [0.9, 0.7, 0.8],
  gradientScale: 0.8,
  sceneTint: [0.98, 0.85, 0.95],
  clearTint: [0.75, 0.5, 0.65],
  glowBoost: 1.15,
};

/**
 * Deep teal-blue moonlight — the darkest frame, but fully legible: a moonlit
 * key at ~30 %, not a crushed grade. Torches and glows carry the scene (the
 * light-gain boost lives in `dayCycle.ts`; the glow boost here).
 */
const NIGHT_MODIFIER: PhaseModifier = {
  ...NOON_MODIFIER,
  keyScale: 0.46,
  // Pushed well past neutral: Lorencia's warm bake × a mild blue tint lands
  // on grey-brown, and the reference night is unmistakably teal-blue air.
  // The blue has to win the multiply, not split it — but the frame must
  // stay legible (a moonlit ground, not a black one).
  skyTint: [0.42, 0.58, 1.0],
  sunTint: [0.6, 0.74, 1],
  bakeScale: 0.78,
  bakeTint: [0.44, 0.6, 1.02],
  exposureShift: 0,
  highlightsSaturationShift: -20,
  // The blue must survive the grade: several maps author their shadow
  // saturation well below zero (Lorencia -25), which turns the night's
  // blue split-tone grey - the shift wins it back, and the density leans
  // on the whole shadow half. Highlights stay untouched so torch pools
  // keep their warmth against the cool air.
  shadowsHue: 215,
  shadowsPush: 0.85,
  shadowsDensityShift: 24,
  shadowsSaturationShift: 22,
  saturationShift: 0,
  bloomThresholdShift: -0.12,
  // The fog must sit *under* a keyScale-0.3 scene, not on top of it: the
  // reference night (dawn_dusk_noon_night.jpg) is deep blue air with the
  // torches and item glows carrying the frame, no grey veil.
  fogTint: [0.22, 0.3, 0.42],
  fogDensityScale: 0.55,
  gradientScale: 0.35,
  sceneTint: [0.6, 0.75, 1.0],
  clearTint: [0.15, 0.21, 0.3],
  glowBoost: 1.4,
};

const PHASE_MODIFIERS: Record<CyclePhase, PhaseModifier> = {
  dawn: DAWN_MODIFIER,
  noon: NOON_MODIFIER,
  dusk: DUSK_MODIFIER,
  night: NIGHT_MODIFIER,
};

/**
 * What the current map allows the cycle to do: the entry's `dayCycle` scale
 * (0 for interiors and event set-pieces, damped for Atlans) and the authored
 * clear colour the retint anchors on. Set by `loadMapIntoScene` per warp —
 * per-map decisions live on the map entry, not here.
 */
const cycleContext = {
  scale: 0,
  baseClear: null as readonly [number, number, number] | null,
};

export function setCycleContext(
  scale: number,
  baseClear: readonly [number, number, number] | null
): void {
  cycleContext.scale = Math.max(0, Math.min(1, scale));
  cycleContext.baseClear = baseClear;
}

/** `/time <dawn|noon|dusk|night|0..1|off>` — freeze or release the clock. */
export function runTimeCommand(arg: string): boolean {
  const t = parseCycleTime(arg);

  if (t === undefined) return false;

  setCycleOverride(t);
  requestCycleRefresh();
  return true;
}

/** The `?tod=` URL override, for deterministic screenshots. Call once. */
export function installCycleUrlOverride(search: string): void {
  const tod = new URLSearchParams(search).get('tod');

  if (tod) runTimeCommand(tod);
}

/** How often the modulation recomputes outside a mood blend, seconds. */
const CYCLE_TICK = 0.2;

const cycleState: CycleState = cycleStateAt(0, {
  t: 0,
  sunAzimuth: 0,
  sunElevation: 0,
  weights: { dawn: 0, noon: 1, dusk: 0, night: 0 },
  lightGain: 1,
});

let cycleTimer = 0;

/**
 * The cycle strength on screen: map scale × option × the area fade. The area
 * fade eases toward 0 while an area mood (tavern) is active, on the mood
 * fade's own clock, so stepping through the door cannot pop the grade — a
 * candle-lit room looks the same at noon and midnight.
 */
let cycleAreaFade = 1;
let cycleStrengthShown = 0;

/** Forces the next `updateSceneMood` to rewrite (override changed, etc.). */
let cycleDirty = false;

function requestCycleRefresh(): void {
  cycleDirty = true;
}

function cycleTargetStrength(): number {
  if (!GameOptions.dayNightCycle) return 0;
  return cycleContext.scale * cycleAreaFade;
}

/** The phase modifiers blended by the cycle weights, scaled by strength. */
const blendedModifier = {
  keyScale: 1,
  skyTint: [1, 1, 1] as [number, number, number],
  sunTint: [1, 1, 1] as [number, number, number],
  bakeScale: 1,
  bakeTint: [1, 1, 1] as [number, number, number],
  exposureShift: 0,
  contrastShift: 0,
  highlightsHueX: 0,
  highlightsHueY: 0,
  highlightsPush: 0,
  highlightsDensityShift: 0,
  highlightsSaturationShift: 0,
  shadowsHueX: 0,
  shadowsHueY: 0,
  shadowsPush: 0,
  shadowsDensityShift: 0,
  shadowsSaturationShift: 0,
  saturationShift: 0,
  bloomThresholdShift: 0,
  fogTint: [1, 1, 1] as [number, number, number],
  fogDensityScale: 1,
  gradientScale: 1,
  sceneTint: [1, 1, 1] as [number, number, number],
  clearTint: [1, 1, 1] as [number, number, number],
  glowBoost: 1,
};

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Sum the four phase rows by the cycle weights (they sum to 1), then damp
 * the result toward identity by `strength`. Hues accumulate as push-weighted
 * vectors so 320° and 280° blend to 300° instead of through the far side of
 * the wheel.
 */
function blendPhaseModifiers(strength: number): void {
  const m = blendedModifier;

  m.keyScale = 0;
  m.bakeScale = 0;
  m.fogDensityScale = 0;
  m.gradientScale = 0;
  m.glowBoost = 0;
  m.exposureShift = 0;
  m.contrastShift = 0;
  m.highlightsHueX = m.highlightsHueY = m.highlightsPush = 0;
  m.highlightsDensityShift = m.highlightsSaturationShift = 0;
  m.shadowsHueX = m.shadowsHueY = m.shadowsPush = 0;
  m.shadowsDensityShift = m.shadowsSaturationShift = 0;
  m.saturationShift = 0;
  m.bloomThresholdShift = 0;
  m.skyTint[0] = m.skyTint[1] = m.skyTint[2] = 0;
  m.sunTint[0] = m.sunTint[1] = m.sunTint[2] = 0;
  m.bakeTint[0] = m.bakeTint[1] = m.bakeTint[2] = 0;
  m.fogTint[0] = m.fogTint[1] = m.fogTint[2] = 0;
  m.sceneTint[0] = m.sceneTint[1] = m.sceneTint[2] = 0;
  m.clearTint[0] = m.clearTint[1] = m.clearTint[2] = 0;

  for (const phase of Object.keys(PHASE_MODIFIERS) as CyclePhase[]) {
    const w = cycleState.weights[phase];

    if (w <= 0) continue;

    const p = PHASE_MODIFIERS[phase];

    m.keyScale += w * p.keyScale;
    m.bakeScale += w * p.bakeScale;
    m.fogDensityScale += w * p.fogDensityScale;
    m.gradientScale += w * p.gradientScale;
    m.glowBoost += w * p.glowBoost;
    m.exposureShift += w * p.exposureShift;
    m.contrastShift += w * p.contrastShift;
    m.saturationShift += w * p.saturationShift;
    m.bloomThresholdShift += w * p.bloomThresholdShift;
    m.highlightsDensityShift += w * p.highlightsDensityShift;
    m.highlightsSaturationShift += w * p.highlightsSaturationShift;
    m.shadowsDensityShift += w * p.shadowsDensityShift;
    m.shadowsSaturationShift += w * p.shadowsSaturationShift;

    const hiPush = w * p.highlightsPush;

    m.highlightsPush += hiPush;
    m.highlightsHueX += hiPush * Math.cos(p.highlightsHue * RAD);
    m.highlightsHueY += hiPush * Math.sin(p.highlightsHue * RAD);

    const shPush = w * p.shadowsPush;

    m.shadowsPush += shPush;
    m.shadowsHueX += shPush * Math.cos(p.shadowsHue * RAD);
    m.shadowsHueY += shPush * Math.sin(p.shadowsHue * RAD);

    for (let i = 0; i < 3; i++) {
      m.skyTint[i] += w * p.skyTint[i];
      m.sunTint[i] += w * p.sunTint[i];
      m.bakeTint[i] += w * p.bakeTint[i];
      m.fogTint[i] += w * p.fogTint[i];
      m.sceneTint[i] += w * p.sceneTint[i];
      m.clearTint[i] += w * p.clearTint[i];
    }
  }

  // Damp toward identity: scales lerp to 1, shifts and pushes to 0.
  const s = strength;

  m.keyScale = 1 + (m.keyScale - 1) * s;
  m.bakeScale = 1 + (m.bakeScale - 1) * s;
  m.fogDensityScale = 1 + (m.fogDensityScale - 1) * s;
  m.gradientScale = 1 + (m.gradientScale - 1) * s;
  m.glowBoost = 1 + (m.glowBoost - 1) * s;
  m.exposureShift *= s;
  m.contrastShift *= s;
  m.saturationShift *= s;
  m.bloomThresholdShift *= s;
  m.highlightsDensityShift *= s;
  m.highlightsSaturationShift *= s;
  m.shadowsDensityShift *= s;
  m.shadowsSaturationShift *= s;
  m.highlightsPush *= s;
  m.shadowsPush *= s;

  for (let i = 0; i < 3; i++) {
    m.skyTint[i] = 1 + (m.skyTint[i] - 1) * s;
    m.sunTint[i] = 1 + (m.sunTint[i] - 1) * s;
    m.bakeTint[i] = 1 + (m.bakeTint[i] - 1) * s;
    m.fogTint[i] = 1 + (m.fogTint[i] - 1) * s;
    m.sceneTint[i] = 1 + (m.sceneTint[i] - 1) * s;
    m.clearTint[i] = 1 + (m.clearTint[i] - 1) * s;
  }
}

/** Wrap-aware pull of `hue` toward the accumulated target, by `push`. */
function pushHue(hue: number, x: number, y: number, push: number): number {
  if (push <= 0) return hue;

  const target = Math.atan2(y, x) * DEG;
  const delta = ((target - hue + 540) % 360) - 180;

  return hue + delta * push;
}

export const terrainBakeTint: [number, number, number] = [1, 1, 1];

/**
 * How much of the hemispheric key the ground gets back **indoors**, as a
 * fraction of what an object standing on it already receives.
 *
 * The two are not lit by the same things and never have been. An object is a
 * Standard material: sky + sun + the torch pool + its body light. The terrain
 * is a hand-written shader whose entire light term is `bake + dynamicLight` —
 * it has no key at all. Outdoors that is right, because the lightmap *is* the
 * sky's contribution, baked; indoors it is not, because the bake there is the
 * room's own dark authored value while the hemispheric light, which nothing
 * can occlude, keeps handing the furniture its full share.
 *
 * So in a room the only thing lighting the floor is the candles, and the floor
 * takes 100% of their hue: MU's floor lights are near-pure hue (the Devias
 * candelabra are (1, 0.66, 0.3)), which is the saturated orange-into-maroon
 * wash the reading room came out with — while the benches standing in it read
 * as warm wood, because for them the candles are a *tint* on a broad key
 * rather than the whole of the light.
 *
 * Below parity because the bake is still carrying part of the room; the point
 * is to give the floor a base for the candles to colour, not to relight it.
 */
const INTERIOR_GROUND_KEY = 0.6;

/**
 * The key the terrain adds under a roof — `INTERIOR_GROUND_KEY` of the sky's,
 * in the sky's own colour. Weighted by the openness mask in the terrain
 * shader, so it stops at the door and no outdoor map ever sees it.
 */
export const terrainInteriorAmbient: [number, number, number] = [0, 0, 0];

const MOOD_BY_WORLD: Partial<Record<ENUM_WORLD, SceneMood>> = {
  [ENUM_WORLD.WD_0LORENCIA]: LORENCIA_MOOD,
  [ENUM_WORLD.WD_1DUNGEON]: DUNGEON_MOOD,
  [ENUM_WORLD.WD_2DEVIAS]: DEVIAS_MOOD,
  [ENUM_WORLD.WD_3NORIA]: NORIA_MOOD,
  [ENUM_WORLD.WD_4LOSTTOWER]: LOST_TOWER_MOOD,
  [ENUM_WORLD.WD_6STADIUM]: STADIUM_MOOD,
  [ENUM_WORLD.WD_7ATLANSE]: ATLANS_MOOD,
  [ENUM_WORLD.WD_8TARKAN]: TARKAN_MOOD,
  [ENUM_WORLD.WD_10ICARUS]: ICARUS_MOOD,
  [ENUM_WORLD.WD_72EMPIREGUARDIAN4]: INDOOR_MOOD,
  [ENUM_WORLD.WD_73NEW_LOGIN_SCENE]: INDOOR_MOOD,
  [ENUM_WORLD.WD_74NEW_CHARACTER_SCENE]: CHARACTER_MOOD,
};

/** GlowLayer gain on the trim emissive map (the surface adds its own share). */
const TRIM_GLOW = 0.6;

/** The PBR material's emissive map for a mesh, when Enhanced is on and it exists. */
function trimEmissive(mesh: AbstractMesh) {
  // A mesh outside the Characters scope is on the Standard material and has
  // no emissive map bound, so the layer must not draw one built for it back
  // when the scope was wider. At Detail 0 the surface adds no emissive of its
  // own either, so the halo goes with it.
  if (!meshTakesPbrMaps(mesh) || pbrDetailStrength() <= 0) return null;

  return pbrMapsIfReady(mesh.metadata?.diffuseTexture)?.emissive ?? null;
}

/**
 * The sun is the only key light that should throw a highlight: the PBR
 * material reads specular off it, the Standard one ignores it either way.
 */
function syncKeyLightSpecular(scene: Scene) {
  syncSpecular(scene, pbrMaterialsOn() ? specularLightScale() : 0);
}

export function applySceneLook(
  scene: Scene,
  camera: ArcRotateCamera
): SceneLook | undefined {
  if (LOOK_INTENSITY <= 0) return undefined;

  const glow = new GlowLayer('glow', scene, {
    mainTextureFixedSize: 256,
    blurKernelSize: 32,
  });
  // applySceneMood below sets the real value from the Glow slider.
  glow.intensity = 0;

  // Item glow: the item materials are shared and frozen with a
  // black emissive, so the layer is a no-op until a mesh carries an
  // `itemTier` — then it glows with the tier's pulsing colour on the shared
  // clock. Meshes flagged to use their own material (blend meshes) ignore
  // this and keep their current look.
  glow.customEmissiveColorSelector = (mesh, _subMesh, _material, result) => {
    const tier = mesh.metadata?.itemTier as ItemVisualTier | null | undefined;

    if (!tier || !tier.improvedActive || !improvedItemEffectsOn()) {
      // Enhanced materials: gems and trim glow through their emissive map
      // ('emissive textures for armor trim & gems'); the texture
      // selector below hands the map over, this is its gain.
      if (trimEmissive(mesh)) result.set(TRIM_GLOW, TRIM_GLOW, TRIM_GLOW, 1);
      else result.set(0, 0, 0, 1);
      return;
    }

    itemEmissiveAt(tier, itemGlowClock(), result);
  };

  // A tier glow covers the whole mesh, so the trim map only stands in when
  // no tier is active — otherwise it would mask the tier colour to the trim.
  glow.customEmissiveTextureSelector = (mesh, _subMesh, material) => {
    const tier = mesh.metadata?.itemTier as ItemVisualTier | null | undefined;
    const own = (material as { emissiveTexture?: Texture | null }).emissiveTexture ?? null;

    // Babylon types the return as non-null but handles null (no texture).
    if (tier && tier.improvedActive && improvedItemEffectsOn()) return own!;

    return ((trimEmissive(mesh) as Texture | null) ?? own)!;
  };

  const pipeline = new DefaultRenderingPipeline(
    'sceneLook',
    true,
    scene,
    [camera]
  );

  // Every pass below is driven by an option in applySceneMood; the pipeline
  // starts with all of them off so nothing runs that no slider asked for.
  pipeline.fxaaEnabled = false;
  pipeline.samples = pipelineSamples();

  pipeline.bloomEnabled = false;
  pipeline.bloomScale = 0.5;

  pipeline.chromaticAberrationEnabled = false;

  pipeline.imageProcessingEnabled = TONE_MAPPING_ENABLED;

  if (TONE_MAPPING_ENABLED) {
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType =
      ImageProcessingConfiguration.TONEMAPPING_ACES;

    pipeline.imageProcessing.vignetteBlendMode =
      ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
    pipeline.imageProcessing.vignetteCameraFov = camera.fov;
  }

  pipeline.sharpen.colorAmount = 1;

  // Intensity is the slider's; applySceneMood below sets it.
  pipeline.grain.animated = true;

createMapGradient(scene, camera);

  const look = { pipeline, glow };

  installCycleUrlOverride(
    typeof window === 'undefined' ? '' : window.location.search
  );

  applySceneMood(scene, look, ENUM_WORLD.WD_0LORENCIA);

  syncEnhancedLighting(scene, camera);

  syncPbrDetail();
  installMaterialDebug(scene);

  onGameOptionsChanged(() => {
    syncEnhancedLighting(scene, camera);
    syncMaterialQuality(scene);
    syncPbrDetail();
    syncKeyLightSpecular(scene);
    applySceneMood(scene, look, appliedWorld);
  });

  return look;
}

let appliedWorld: ENUM_WORLD = ENUM_WORLD.WD_0LORENCIA;

const curves = new ColorCurves();

const MOOD_FADE_SECONDS = 0.7;

type MutableFog = {
  color: [number, number, number];
  density: number;
  falloff: number;
  base: number;
  maxOpacity: number;
};

type MutableMood = {
  -readonly [K in keyof SceneMood]-?: K extends 'fog'
    ? MutableFog
    : SceneMood[K] extends readonly [
    number,
    number,
    number,
  ]
    ? [number, number, number]
    : SceneMood[K] extends SplitTone
      ? { -readonly [S in keyof SplitTone]: SplitTone[S] }
      : SceneMood[K];
};

function cloneMood(m: SceneMood): MutableMood {
  return {
    ...m,
    splitTone: { ...m.splitTone },
    skyDiffuse: [...m.skyDiffuse],
    skyGround: [...m.skyGround],
    sunDiffuse: [...m.sunDiffuse],
    terrainBake: [...m.terrainBake],
    fog: cloneFog(m.fog ?? NO_FOG),
  };
}

function cloneFog(f: FogSettings): MutableFog {
  return { ...f, color: [f.color[0], f.color[1], f.color[2]] };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerp3 = (
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
  out: [number, number, number]
) => {
  out[0] = lerp(a[0], b[0], t);
  out[1] = lerp(a[1], b[1], t);
  out[2] = lerp(a[2], b[2], t);
};

function lerpMood(
  a: SceneMood,
  b: SceneMood,
  t: number,
  out: MutableMood
): void {
  out.exposure = lerp(a.exposure, b.exposure, t);
  out.contrast = lerp(a.contrast, b.contrast, t);

  out.splitTone.highlightsHue = lerp(
    a.splitTone.highlightsHue,
    b.splitTone.highlightsHue,
    t
  );
  out.splitTone.highlightsDensity = lerp(
    a.splitTone.highlightsDensity,
    b.splitTone.highlightsDensity,
    t
  );
  out.splitTone.shadowsHue = lerp(
    a.splitTone.shadowsHue,
    b.splitTone.shadowsHue,
    t
  );
  out.splitTone.shadowsDensity = lerp(
    a.splitTone.shadowsDensity,
    b.splitTone.shadowsDensity,
    t
  );
  out.splitTone.saturation = lerp(
    a.splitTone.saturation,
    b.splitTone.saturation,
    t
  );
  out.splitTone.highlightsSaturation = lerp(
    a.splitTone.highlightsSaturation ?? 0,
    b.splitTone.highlightsSaturation ?? 0,
    t
  );
  out.splitTone.shadowsSaturation = lerp(
    a.splitTone.shadowsSaturation ?? 0,
    b.splitTone.shadowsSaturation ?? 0,
    t
  );

  out.sky = lerp(a.sky, b.sky, t);
  out.sun = lerp(a.sun, b.sun, t);

  lerp3(a.skyDiffuse, b.skyDiffuse, t, out.skyDiffuse);
  lerp3(a.skyGround, b.skyGround, t, out.skyGround);
  lerp3(a.sunDiffuse, b.sunDiffuse, t, out.sunDiffuse);
  lerp3(a.terrainBake, b.terrainBake, t, out.terrainBake);

  out.gradient = lerp(a.gradient, b.gradient, t);
  out.bloomThreshold = lerp(a.bloomThreshold, b.bloomThreshold, t);
  out.bloomWeight = lerp(a.bloomWeight, b.bloomWeight, t);
  out.bloomKernel = lerp(a.bloomKernel, b.bloomKernel, t);
  out.vignetteWeight = lerp(a.vignetteWeight, b.vignetteWeight, t);

  const fa = a.fog ?? NO_FOG;
  const fb = b.fog ?? NO_FOG;

  // A fog fading in keeps the colour of the side that has one.
  const colorFrom = fa.density > 0 ? fa.color : fb.color;
  const colorTo = fb.density > 0 ? fb.color : fa.color;

  lerp3(colorFrom, colorTo, t, out.fog.color);
  out.fog.density = lerp(fa.density, fb.density, t);
  out.fog.falloff = lerp(fa.falloff, fb.falloff, t);
  out.fog.base = lerp(fa.base, fb.base, t);
  out.fog.maxOpacity = lerp(fa.maxOpacity, fb.maxOpacity, t);
}

let areaMood: SceneMood | null = null;

const moodFrom = cloneMood(DEFAULT_MOOD);
const moodShown = cloneMood(DEFAULT_MOOD);
let moodTarget: SceneMood = DEFAULT_MOOD;
let moodBlend = 1;

/**
 * The mood actually written to the frame: `moodShown` (the blend output)
 * with the cycle's phase modifiers applied on top. One writer of
 * `moodShown` (the blend), one modulation over its *output* — the tavern
 * fade and the cycle compose instead of fighting. Identical to `moodShown`
 * whenever the cycle is off.
 */
const moodEffective = cloneMood(DEFAULT_MOOD);

/** `moodShown` × the blended phase modifier → `moodEffective`. */
function modulateShownMood(): void {
  lerpMood(moodShown, moodShown, 0, moodEffective);

  if (cycleStrengthShown <= 0) return;

  const m = blendedModifier;
  const out = moodEffective;

  out.sky *= m.keyScale;
  out.sun *= m.keyScale;

  for (let i = 0; i < 3; i++) {
    out.skyDiffuse[i] *= m.skyTint[i];
    out.skyGround[i] *= m.skyTint[i];
    out.sunDiffuse[i] *= m.sunTint[i];
    out.terrainBake[i] *= m.bakeScale * m.bakeTint[i];
    out.fog.color[i] *= m.fogTint[i];
  }

  out.exposure += m.exposureShift;
  out.contrast += m.contrastShift;
  out.bloomThreshold += m.bloomThresholdShift;
  out.fog.density *= m.fogDensityScale;
  out.gradient *= m.gradientScale;

  const st = out.splitTone;

  st.highlightsHue = pushHue(
    st.highlightsHue,
    m.highlightsHueX,
    m.highlightsHueY,
    m.highlightsPush
  );
  st.shadowsHue = pushHue(
    st.shadowsHue,
    m.shadowsHueX,
    m.shadowsHueY,
    m.shadowsPush
  );
  st.highlightsDensity += m.highlightsDensityShift;
  st.shadowsDensity += m.shadowsDensityShift;
  st.saturation += m.saturationShift;
  st.highlightsSaturation =
    (st.highlightsSaturation ?? 0) + m.highlightsSaturationShift;
  st.shadowsSaturation =
    (st.shadowsSaturation ?? 0) + m.shadowsSaturationShift;
}

/**
 * The sun's direction from the cycle's angles — or the authored constant
 * when the cycle is off. Damped maps lerp between the two, so Atlans' sun
 * only drifts. The rig owns the light and the maths (keyRig.ts); this is the
 * cycle's one consumer seam.
 */
function applyCycleSun(scene: Scene, strength: number): void {
  setSunDirection(
    scene,
    cycleState.sunAzimuth,
    cycleState.sunElevation,
    strength
  );
}

/**
 * The sky is the clear colour (no skybox), so the cycle retints the map's
 * authored bytes. Maps that declare none stay black — nothing to tint.
 */
function applyCycleClear(scene: Scene): void {
  const base = cycleContext.baseClear;

  if (!base) return;

  const tint = blendedModifier.clearTint;

  // The sky bytes are authored at screen brightness (original client data);
  // divide out the unified regrade's exposure the same way compensateFog
  // does, or the raised grade re-exposes the sky.
  const scale =
    UNIFIED_LIGHT_MODEL && moodEffective.exposure > 0
      ? 1 / moodEffective.exposure
      : 1;

  scene.clearColor.set(
    base[0] * tint[0] * scale,
    base[1] * tint[1] * scale,
    base[2] * tint[2] * scale,
    1
  );
}

/**
 * Recompute everything the cycle touches and write the frame: state from the
 * shared clock, modifiers, the modulated mood, sun direction, clear colour,
 * and the dynamic-light gain. Also the identity write-back that restores
 * today's look when the strength has just reached 0.
 */
function refreshCycle(scene: Scene, look: SceneLook | undefined): void {
  const s = cycleStrengthShown;

  if (s > 0) cycleStateAt(serverNow(), cycleState);

  blendPhaseModifiers(s);
  modulateShownMood();
  setCycleLightGain(1 + (cycleState.lightGain - 1) * s);
  writeMood(scene, look, moodEffective);
  applyCycleSun(scene, s);
  applyCycleClear(scene);
}

const resolveMood = (world: ENUM_WORLD): SceneMood =>
  areaMood ?? MOOD_BY_WORLD[world] ?? DEFAULT_MOOD;

/**
 * The mood a map resolves to right now: the area override if one is set,
 * else the world's row, else the default. Consumers read it through
 * `lighting.moodFor(map)`; the tables stay here with the grade they drive.
 */
export function moodFor(world: ENUM_WORLD): SceneMood {
  return resolveMood(world);
}

export function setAreaMood(name: AreaMoodName | null): void {
  const next = name ? AREA_MOODS[name] : null;

  if (areaMood === next) return;

  areaMood = next;

  const target = resolveMood(appliedWorld);

  if (target === moodTarget) return;

  lerpMood(moodShown, moodShown, 0, moodFrom);

  moodTarget = target;
  moodBlend = 0;
}

/**
 * The GlowLayer has no render list — it draws *every active mesh* into its
 * own render target every frame and lets the emissive selectors decide the
 * colour, so a scene where nothing glows still pays for a second full
 * geometry pass. Nothing glows unless an item tier is stamped, a blend mesh
 * has been handed its own material, or the Enhanced materials' trim emissive
 * maps are live — so the layer is switched off outright the rest of the time.
 */
const GLOW_PROBE_INTERVAL = 0.25;

let glowProbeTimer = 0;
let glowSourcesPresent = false;

/** Re-checks on the next frame instead of waiting out the interval. */
export function requestGlowProbe(): void {
  glowProbeTimer = 0;
}

function anyGlowSource(scene: Scene): boolean {
  const improved = improvedItemEffectsOn();
  // Enhanced materials *can* carry emissive trim/gem maps, but the derivation
  // only binds one when saturated highlights cover enough of the texture, and
  // most of the world's art clears that bar nowhere — none of Lorencia's wood,
  // stone or wall sets produce a map at all. Assuming Enhanced always glows
  // bought a full extra geometry pass every frame for a layer with nothing to
  // draw, so the probe asks the meshes instead.
  const pbr = pbrMaterialsOn();

  for (const mesh of scene.meshes) {
    const meta = mesh.metadata;
    if (!meta) continue;

    if (meta.glowOwnMaterial) return true;

    if (pbr && trimEmissive(mesh)) return true;

    const tier = meta.itemTier as ItemVisualTier | null | undefined;
    if (improved && tier?.improvedActive) return true;
  }

  return false;
}

function syncGlowEnabled(scene: Scene, look: SceneLook | undefined): void {
  if (!look) return;

  glowProbeTimer -= scene.getEngine().getDeltaTime() / 1000;

  if (glowProbeTimer <= 0) {
    glowProbeTimer = GLOW_PROBE_INTERVAL;
    glowSourcesPresent = anyGlowSource(scene);
  }

  const enabled = glowSourcesPresent && look.glow.intensity > 0;

  if (look.glow.isEnabled !== enabled) look.glow.isEnabled = enabled;
}

/**
 * The sky's own light right now — the shown mood's `skyDiffuse` scaled by its
 * `sky` share, in linear RGB.
 *
 * Exported for standing water (`libs/mu/terrainOverlay.ts`), which needs a
 * **zenith** colour to reflect. The fog colour it already had is the horizon,
 * and a reflection that is one flat colour top to bottom is the thing that
 * reads as a texture rather than as water: what says "sky" is the gradient
 * between the two, moving as the camera does.
 *
 * The shown mood rather than the map's, so a puddle in the tavern doorway
 * crosses to the interior grade with everything else instead of snapping.
 *
 * Written into a module array rather than allocated: this is read once per
 * terrain bind, every frame.
 */
const skyLightShown: [number, number, number] = [0, 0, 0];

export function shownSkyLight(): readonly [number, number, number] {
  skyLightShown[0] = moodEffective.skyDiffuse[0] * moodEffective.sky;
  skyLightShown[1] = moodEffective.skyDiffuse[1] * moodEffective.sky;
  skyLightShown[2] = moodEffective.skyDiffuse[2] * moodEffective.sky;
  return skyLightShown;
}

export function updateSceneMood(
  scene: Scene,
  look: SceneLook | undefined
): void {
  updateEnhancedLighting(scene);

  syncGlowEnabled(scene, look);

  const dt = scene.getEngine().getDeltaTime() / 1000;

  // Inside an area mood (tavern) the cycle eases out on the mood fade's own
  // clock, so both cross the door as one transition.
  const areaTarget = areaMood ? 0 : 1;
  const step = dt / MOOD_FADE_SECONDS;

  cycleAreaFade +=
    Math.sign(areaTarget - cycleAreaFade) *
    Math.min(step, Math.abs(areaTarget - cycleAreaFade));

  const blending = moodBlend < 1;

  if (blending) {
    moodBlend = Math.min(1, moodBlend + step);

    const t = moodBlend * moodBlend * (3 - 2 * moodBlend);

    lerpMood(moodFrom, moodTarget, t, moodShown);
  }

  cycleTimer -= dt;

  const strength = cycleTargetStrength();

  // Rewrite when the blend moved, the strength moved (fades, toggles - the
  // last step to 0 restores today's look bit for bit), the override changed,
  // or the slow clock ticked. The cycle crawls (a game day is an hour), so
  // ~5 Hz between blends is plenty and writeMood is uniform writes only.
  const dirty =
    blending ||
    cycleDirty ||
    strength !== cycleStrengthShown ||
    (strength > 0 && cycleTimer <= 0);

  if (!dirty) return;

  cycleDirty = false;
  cycleTimer = CYCLE_TICK;
  cycleStrengthShown = strength;

  refreshCycle(scene, look);
}

export function applySceneMood(
  scene: Scene,
  look: SceneLook | undefined,
  world: ENUM_WORLD
): void {
  if (world !== appliedWorld) areaMood = null;

  appliedWorld = world;

  const mood = resolveMood(world);

  moodTarget = mood;
  moodBlend = 1;
  lerpMood(mood, mood, 0, moodShown);
  lerpMood(mood, mood, 0, moodFrom);

  // A snap, not a fade: the warp screen covers it, and the options path
  // wants the new values now.
  cycleAreaFade = areaMood ? 0 : 1;
  cycleStrengthShown = cycleTargetStrength();

  refreshCycle(scene, look);
}

function writeMood(
  scene: Scene,
  look: SceneLook | undefined,
  mood: SceneMood
): void {
  applyMapGradient(
    appliedWorld,
    GameOptions.postProcessing ? mapGradientStrength() * mood.gradient : 0,
    mood.exposure,
    GameOptions.postProcessing ? blendedModifier.sceneTint : undefined
  );

  [terrainBakeTint[0], terrainBakeTint[1], terrainBakeTint[2]] =
    mood.terrainBake;
  [bodyLightTint[0], bodyLightTint[1], bodyLightTint[2]] = mood.terrainBake;

  // The mood exposure rides along so the fog pass can divide the unified
  // regrade back out of its authored display-space colour (enhancedLighting).
  setEnhancedFog(mood.fog ?? NO_FOG, mood.exposure);

  // Key-light shaping belongs to the Enhanced/Ultra tiers: the directional
  // sun (lambert shape + CSM) and the sky/ground hemisphere split. Classic is
  // the original flat look — objects are the texture × the terrain light, so
  // the sun is parked and its energy folded into a flat (ground = sky)
  // hemisphere. The moods' key sums are preserved either way, and the torch
  // pool keeps adding on both.
  const shaped = lightingTier() !== null;

  // Same key budget either way; the shaped tiers hand the sun a larger share
  // of it so the lambert shape and the cascaded shadow actually read.
  const keyTotal = mood.sky + mood.sun;
  const sunShare = Math.max(mood.sun, keyTotal * SHAPED_SUN_SHARE);

  const skyIntensity = shaped ? keyTotal - sunShare : keyTotal;

  // The ground's share of that key, for roofed tiles only — see
  // INTERIOR_GROUND_KEY. An up-facing surface takes a hemispheric light's
  // `diffuse` colour whole, so this is exactly what the floor would be given
  // if it were an object, scaled down.
  const groundKey = INTERIOR_GROUND_KEY * skyIntensity;

  terrainInteriorAmbient[0] = groundKey * mood.skyDiffuse[0];
  terrainInteriorAmbient[1] = groundKey * mood.skyDiffuse[1];
  terrainInteriorAmbient[2] = groundKey * mood.skyDiffuse[2];

  setKey(scene, {
    skyIntensity,
    skyDiffuse: mood.skyDiffuse as [number, number, number],
    skyGround: shaped ? (mood.skyGround as [number, number, number]) : null,
    sunIntensity: shaped ? sunShare * directLightGain() : 0,
    sunDiffuse: mood.sunDiffuse as [number, number, number],
  });

  // What the PBR material has to make up on its own when the lights are left
  // at Classic intensities because the world is still Standard-lit.
  setPbrKeyGain(skyIntensity, shaped ? sunShare : 0);

  syncKeyLightSpecular(scene);

  if (!look) return;

  const { pipeline, glow } = look;

  const post = GameOptions.postProcessing;

  // The improved item look is drawn by the glow layer, so it stays alive
  // without post-processing — otherwise "Improved" is invisible.
  const glowLive = post || improvedItemEffectsOn();

  // The cycle's dark-hours boost rides on top of the slider: emissives
  // (wings, item tiers, trim) pop at night as in the reference, and the
  // night modifier's lower bloom threshold pulls the same direction.
  glow.intensity =
    glowLive
      ? (Math.max(0, GameOptions.glow) / GRAIN_MAX) *
        GLOW_MAX_INTENSITY *
        LOOK_INTENSITY *
        blendedModifier.glowBoost
      : 0;

  const sharpness = post ? Math.max(0, GameOptions.sharpness) : 0;

  pipeline.sharpenEnabled = sharpness > 0;
  pipeline.sharpen.edgeAmount = (sharpness / 9) * SHARPEN_MAX_EDGE_AMOUNT;

  const grain = post ? Math.max(0, GameOptions.filmGrain) : 0;

  pipeline.grainEnabled = grain > 0;
  pipeline.grain.intensity = (grain / GRAIN_MAX) * GRAIN_INTENSITY;

  const bloom = post ? Math.max(0, GameOptions.bloom) : 0;

  pipeline.bloomEnabled = bloom > 0;
  // Authored against the old buffer, which the same content now reaches at
  // 1/exposure of the old value (the unified regrade multiplies it back in
  // image processing, after bloom has already sampled) - so the threshold
  // divides by the mood exposure or bloom goes half-dead everywhere.
  pipeline.bloomThreshold = UNIFIED_LIGHT_MODEL
    ? mood.bloomThreshold / mood.exposure
    : mood.bloomThreshold;
  pipeline.bloomWeight =
    mood.bloomWeight * (bloom / GRAIN_MAX) * LOOK_INTENSITY;
  pipeline.bloomKernel = mood.bloomKernel;

  const chromatic = post ? Math.max(0, GameOptions.chromatic) : 0;

  pipeline.chromaticAberrationEnabled = chromatic > 0;
  pipeline.chromaticAberration.aberrationAmount =
    (chromatic / GRAIN_MAX) * CHROMATIC_MAX;

  pipeline.fxaaEnabled = post && GameOptions.fxaa;

  // With post-processing off the image-processing pass is bypassed outright
  // rather than left running with neutral values: an identity pass is still a
  // full-screen resolve, and "off" should mean the pipeline contributes
  // nothing at all.
  pipeline.imageProcessingEnabled = post;

  if (!pipeline.imageProcessingEnabled) return;

  const ip = pipeline.imageProcessing;

  ip.toneMappingEnabled =
    TONE_MAPPING_ENABLED && post && GameOptions.toneMapping;

  const darken =
    1 - (Math.max(0, Math.min(GRADE_MAX, GameOptions.darkness)) / GRADE_MAX) *
      MAX_DARKEN;

  // Same shape as the contrast slider: the mood value is a lift over neutral,
  // so the slider scales the lift and 0 lands on a flat 1.0.
  const moodExposure =
    1 + (mood.exposure - 1) * gradeScale(GameOptions.exposure);

  ip.exposure =
    post && GameOptions.sceneDarkening ? moodExposure * darken : 1;
  // The mood contrast is a lift over neutral, so the slider scales the lift
  // rather than the value - at 0 the frame comes through at a flat 1.0.
  ip.contrast = post
    ? 1 + (mood.contrast - 1) * gradeScale(GameOptions.contrast)
    : 1;

  const vignette = GameOptions.sceneDarkening
    ? mood.vignetteWeight * gradeScale(GameOptions.vignette)
    : 0;

  ip.vignetteEnabled = post && vignette > 0;
  ip.vignetteWeight = vignette;
  ip.vignetteColor.set(0, 0, 0, 0);

  const tint = gradeScale(GameOptions.colorTint);

  curves.highlightsHue = mood.splitTone.highlightsHue;
  curves.highlightsDensity = clampCurve(
    mood.splitTone.highlightsDensity * tint
  );
  curves.shadowsHue = mood.splitTone.shadowsHue;
  curves.shadowsDensity = clampCurve(mood.splitTone.shadowsDensity * tint);
  const saturation = Math.max(
    SATURATION_MIN,
    Math.min(SATURATION_MAX, GameOptions.saturation)
  );

  curves.globalSaturation = clampCurve(
    mood.splitTone.saturation * tint + saturation * 10
  );
  curves.highlightsSaturation = clampCurve(
    (mood.splitTone.highlightsSaturation ?? 0) * tint
  );
  curves.shadowsSaturation = clampCurve(
    (mood.splitTone.shadowsSaturation ?? 0) * tint
  );

  ip.colorCurves = curves;

  ip.colorCurvesEnabled = post && (tint > 0 || saturation !== 0);
}
