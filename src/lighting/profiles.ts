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
  /**
   * The room's key in key units, where 1.0 is the bake at its authored value
   * (Classic's level): a dim ambient of the map's sky, not a lift (§13 F14).
   * The map's `ev` stays, so the candles - pool lights, terrain delta, flame
   * cards - keep the level they have outdoors and carry the room.
   */
  readonly keyLevel: number;
  readonly whiteBalance: Rgb;
  /** Gain on the room's emitters, the pool lights and the terrain delta alike, on tiers >= 1. */
  readonly candles: number;
  /** The room's key direction: near vertical, a low share, contact grounding only. */
  readonly sun: SunSpec;
};

/** A room's floor in tiles, between the inner wall faces: the mask's frame and the roof lift's seed. */
export type AreaRect = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

/** The floor with its heights: what the room mask draws inside of (§13 F8). */
export type RoomVolume = AreaRect & {
  /** Height the walls stand at. */
  readonly floorY: number;
  /** Top of the walls: a ray through the wall box below this height sees through an opening. */
  readonly wallTop: number;
  /** Underside of the roof: the room volume's ceiling. */
  readonly roofY: number;
};

export function roomVolumeOf(
  min: { x: number; y: number },
  max: { x: number; y: number },
  heights: { floorY: number; wallHeight: number; roofHeight: number }
): RoomVolume {
  return {
    minX: min.x,
    minY: min.y,
    maxX: max.x,
    maxY: max.y,
    floorY: heights.floorY,
    wallTop: heights.floorY + heights.wallHeight,
    roofY: heights.floorY + heights.roofHeight,
  };
}

/**
 * The room's key is cast from near vertical so the furniture's shadow is
 * contact grounding, at a share the eye reads as occlusion rather than a sun
 * (§13 F14).
 */
const ROOM_SUN = sun(0, 80, 0.3);

const WARM_ROOM: Rgb = [1.03, 1.0, 0.96];

const room = (keyLevel: number, candles: number): AreaLook => ({
  keyLevel,
  whiteBalance: WARM_ROOM,
  candles,
  sun: ROOM_SUN,
});

/**
 * Lorencia rooms (map ev 1.8): the pub with candelabra on every table, the
 * cabin across the river. Measured on the pub against Classic: p50 1.22x,
 * pool over floor 0.90x, chairs' tex 1.17x; 0.7 moved the floor 5 % and the
 * pool ratio not at all, the candles carry the room.
 */
const LORENCIA_ROOM = room(0.9, 1);

/**
 * Devias rooms (map ev 0.8): the tavern's hearth and door candelabra, the
 * reading room's desk candelabra, the hearth houses, the guard room. The
 * reading room's dark planks sit at 0.97x Classic p50 at 0.9 and 1.03x here.
 */
const DEVIAS_ROOM = room(1.0, 1);

const AREAS = {
  lorenciaTavern: LORENCIA_ROOM,
  lorenciaCabin: LORENCIA_ROOM,
  deviasTavern: DEVIAS_ROOM,
  deviasReadingRoom: DEVIAS_ROOM,
  deviasHearthHouse: DEVIAS_ROOM,
  deviasGuardRoom: DEVIAS_ROOM,
} satisfies Record<string, AreaLook>;

export type AreaLookName = keyof typeof AREAS;

export function areaProfile(name: AreaLookName): AreaLook {
  return AREAS[name];
}

/** The map's profile with an area laid over it: no sky, no haze, its own balance and key direction; the map's ev stays. */
export function applyArea(base: LookProfile, area: AreaLook): LookProfile {
  return {
    ...base,
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
