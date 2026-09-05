import { ENUM_WORLD } from '../common/types';
import { maps } from '../maps';

export type Rgb = readonly [number, number, number];

/**
 * A map's look: the whole per-map surface (lighting_polish ARCHITECTURE §4.2).
 * Pure data; the director composes it, nothing here touches Babylon.
 */
export type LookProfile = {
  /** Exposure in stops over unity. Classic ignores it. */
  readonly ev: number;
  /** Per-channel multiplier, each within [0.94, 1.06]. Applied luma-neutral. */
  readonly whiteBalance: Rgb;
  /** Sky dome zenith and horizon, display sRGB 0..1. Horizon is also the haze colour. Null = enclosed. */
  readonly sky: { readonly zenith: Rgb; readonly horizon: Rgb } | null;
  /**
   * Distance-gated haze (§4.8): `cap x (1 - exp(-density x max(0, dist - start)))`,
   * in tiles; 0 density = no pass. `height` is the small extra density at
   * ground level that thins upward; `color` overrides the horizon for maps
   * with no sky (Atlans).
   */
  readonly fog: {
    readonly start: number;
    readonly density: number;
    readonly cap: number;
    readonly height: number;
    readonly color: Rgb | null;
  };
  /**
   * Sun direction for the shaped key and its share of the key total; the sky
   * takes the rest, and a shadow removes exactly the share (§3.2).
   */
  readonly sun: SunSpec;
};

export type SunSpec = {
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
  readonly share: number;
};

/** Open sky. Under a roof the bake carries the room, so the key is mostly sky. */
export const OPEN_SUN_SHARE = 0.45;
export const ENCLOSED_SUN_SHARE = 0.15;

const sun = (
  azimuthDeg: number,
  elevationDeg: number,
  share = OPEN_SUN_SHARE
): SunSpec => ({ azimuthDeg, elevationDeg, share });

export const NO_FOG: LookProfile['fog'] = {
  start: 0,
  density: 0,
  cap: 0,
  height: 0,
  color: null,
};

const OPEN_SKY = {
  zenith: [0.55, 0.68, 0.86] as Rgb,
  horizon: [0.74, 0.76, 0.8] as Rgb,
};

const OPEN_HAZE: LookProfile['fog'] = {
  start: 25,
  density: 0.008,
  cap: 0.9,
  height: 0,
  color: null,
};

const NOON_SUN = sun(215, 48);

/** The interior key: the roof takes the sun, what is left comes from the bake. */
const INTERIOR_SUN = sun(0, 60, ENCLOSED_SUN_SHARE);

export const DEFAULT_PROFILE: LookProfile = {
  ev: 1.3,
  whiteBalance: [1, 1, 1],
  sky: OPEN_SKY,
  fog: OPEN_HAZE,
  sun: NOON_SUN,
};

const ENCLOSED_PROFILE: LookProfile = {
  ...DEFAULT_PROFILE,
  sky: null,
  fog: NO_FOG,
  sun: INTERIOR_SUN,
};

const PREGAME_PROFILE: LookProfile = {
  ...ENCLOSED_PROFILE,
  ev: 1.0,
};

const PROFILES: Partial<Record<ENUM_WORLD, LookProfile>> = {
  [ENUM_WORLD.WD_0LORENCIA]: {
    // Measured (wave 1, Standard mapper): 1.6 lands p50 0.424, 1.8 lands 0.451.
    ev: 1.8,
    whiteBalance: [1.02, 1.0, 0.97],
    sky: OPEN_SKY,
    fog: OPEN_HAZE,
    sun: NOON_SUN,
  },
  [ENUM_WORLD.WD_3NORIA]: {
    ev: 1.5,
    whiteBalance: [0.98, 1.02, 0.98],
    sky: { zenith: [0.5, 0.66, 0.84], horizon: [0.72, 0.78, 0.72] },
    fog: OPEN_HAZE,
    sun: NOON_SUN,
  },
  [ENUM_WORLD.WD_2DEVIAS]: {
    ev: 0.8,
    whiteBalance: [0.97, 0.99, 1.04],
    sky: { zenith: [0.62, 0.72, 0.86], horizon: [0.7, 0.76, 0.86] },
    fog: { start: 20, density: 0.012, cap: 0.9, height: 0.02, color: null },
    sun: sun(200, 35),
  },
  [ENUM_WORLD.WD_8TARKAN]: {
    ev: 1.2,
    whiteBalance: [1.04, 1.0, 0.94],
    sky: { zenith: [0.6, 0.7, 0.84], horizon: [0.86, 0.8, 0.66] },
    fog: { start: 25, density: 0.01, cap: 0.9, height: 0, color: null },
    sun: sun(220, 55),
  },
  [ENUM_WORLD.WD_6STADIUM]: {
    ev: 1.4,
    whiteBalance: [1, 1, 1],
    sky: OPEN_SKY,
    fog: { start: 25, density: 0.006, cap: 0.8, height: 0, color: null },
    sun: sun(215, 50),
  },
  [ENUM_WORLD.WD_1DUNGEON]: {
    ...ENCLOSED_PROFILE,
    ev: 1.0,
  },
  [ENUM_WORLD.WD_4LOSTTOWER]: {
    ...ENCLOSED_PROFILE,
    ev: 0.9,
    whiteBalance: [0.98, 0.98, 1.03],
  },
  [ENUM_WORLD.WD_7ATLANSE]: {
    ev: 1.2,
    whiteBalance: [0.94, 1.0, 1.04],
    // Skyless: the haze is the water's own murk, in its colour, and it
    // starts past the hero like every other map's (a 4-tile start veiled the
    // whole frame: lrms 0.012).
    sky: null,
    fog: { start: 25, density: 0.03, cap: 0.85, height: 0.02, color: [0.2, 0.46, 0.54] },
    sun: sun(0, 80, ENCLOSED_SUN_SHARE),
  },
  // The login and character-select backdrops: the Fortress set at night,
  // torch-lit under its own roofs, seen by a flying camera far enough for
  // any open haze cap. No haze, no sky, the room key.
  [ENUM_WORLD.WD_73NEW_LOGIN_SCENE]: PREGAME_PROFILE,
  [ENUM_WORLD.WD_74NEW_CHARACTER_SCENE]: PREGAME_PROFILE,
  [ENUM_WORLD.WD_77NEW_LOGIN_SCENE]: PREGAME_PROFILE,
  [ENUM_WORLD.WD_78NEW_CHARACTER_SCENE]: PREGAME_PROFILE,
  [ENUM_WORLD.WD_10ICARUS]: {
    // The map has an authored clear colour and no ground (MainScene.cpp:402).
    ev: 0.6,
    whiteBalance: [0.97, 0.99, 1.04],
    sky: null,
    fog: NO_FOG,
    sun: sun(200, 40),
  },
};

export function profileFor(world: ENUM_WORLD): LookProfile {
  const own = PROFILES[world];
  if (own) return own;

  return maps.isOutdoor(world) ? DEFAULT_PROFILE : ENCLOSED_PROFILE;
}

/** A lit interior inside a map: what it changes over the map's own profile. */
export type AreaLook = {
  /** Stops relative to the map's `ev`. */
  readonly evDelta: number;
  readonly whiteBalance: Rgb;
  /** The room's key direction: steep, so the furniture's shadows stay on the floor. */
  readonly sun: SunSpec;
};

/** A room's footprint in tiles: the interactive area plus its margin. */
export type AreaRect = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

/** The map's `interactiveArea` bounds widened by `margin` tiles on every side. */
export function areaRectOf(
  min: { x: number; y: number },
  max: { x: number; y: number },
  margin = 1
): AreaRect {
  return {
    minX: min.x - margin,
    minY: min.y - margin,
    maxX: max.x + margin,
    maxY: max.y + margin,
  };
}

const TAVERN: AreaLook = {
  evDelta: -0.4,
  whiteBalance: [1.03, 1.0, 0.96],
  sun: sun(215, 70),
};

const AREAS = {
  lorenciaTavern: TAVERN,
  deviasTavern: TAVERN,
} satisfies Record<string, AreaLook>;

export type AreaLookName = keyof typeof AREAS;

export function areaProfile(name: AreaLookName): AreaLook {
  return AREAS[name];
}

/** The map's profile with an area laid over it: no sky, no haze, its own ev and balance. */
export function applyArea(base: LookProfile, area: AreaLook): LookProfile {
  return {
    ...base,
    ev: base.ev + area.evDelta,
    whiteBalance: area.whiteBalance,
    sky: null,
    fog: NO_FOG,
    sun: area.sun,
  };
}

const DEG = Math.PI / 180;

/** Unit direction the light travels, Babylon Y-up, from azimuth / elevation. */
export function sunDirectionOf(sun: LookProfile['sun']): [number, number, number] {
  const az = sun.azimuthDeg * DEG;
  const el = sun.elevationDeg * DEG;
  const c = Math.cos(el);

  return [-Math.sin(az) * c, -Math.sin(el), -Math.cos(az) * c];
}

/** sRGB display value to linear, per channel. */
export function toLinear(c: Rgb): [number, number, number] {
  return [c[0] ** 2.2, c[1] ** 2.2, c[2] ** 2.2];
}
