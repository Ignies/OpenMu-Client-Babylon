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
  /** The sky the dome draws and the haze reads (sky_atmospherics §3). Null = enclosed. */
  readonly sky: SkyLook | null;
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

/**
 * A map's sky (sky_atmospherics ARCHITECTURE §3). `horizon` is also the haze
 * colour, so moving a graded map's pair moves its whole far field: the five
 * maps that were graded on their pair keep it and take only the new terms.
 */
export type SkyLook = {
  readonly zenith: Rgb;
  readonly horizon: Rgb;
  /** Horizon-to-zenith exponent. 1 is the flat linear ramp; above it the horizon band tightens. */
  readonly curve?: number;
  /** The sun disc and its halo, display sRGB; null for an overcast map with no disc. */
  readonly sun?: Rgb | null;
  /** Halo strength around the sun. */
  readonly halo?: number;
  /** Base cloud coverage, 0..1. */
  readonly clouds?: number;
  /** Far scenery on the skyline; omit for a map whose ground is all there is. */
  readonly skyline?: SkylineLook;
};

/**
 * A painted horizon (sky_atmospherics §10): a panorama strip wrapped around
 * the camera past everything the map draws, so the ground reads as ending in
 * a country rather than in the haze. Nothing the original client had.
 *
 * The angles place the strip's two edges against the eye line, so the art's
 * own skyline lands where its split says it does - Lorencia's sits 52% down
 * the strip, so 6.8 up against 6.2 down puts it on the eye.
 */
export type SkylineLook = {
  /** The strip, served from `public/`. */
  readonly art: string;
  /** Degrees its top edge stands above the eye line. */
  readonly riseDeg: number;
  /** Degrees its bottom edge sits below the eye line. */
  readonly dropDeg: number;
  /** How far the art is pulled toward this sky's horizon colour, 0..1. */
  readonly haze: number;
  /** Fraction of the strip's height its bottom edge dissolves over. */
  readonly fade: number;
};

export const SKY_CURVE_DEFAULT = 0.75;
export const SKY_HALO_DEFAULT = 0.25;
export const SKY_CLOUDS_DEFAULT = 0.4;
export const SKY_SUN_DEFAULT: Rgb = [1.0, 0.96, 0.88];

/** Open sky. Under a roof the bake carries the room, so the key is mostly sky. */
export const OPEN_SUN_SHARE = 0.6;
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

const OPEN_SKY: SkyLook = {
  zenith: [0.34, 0.55, 0.87],
  horizon: [0.72, 0.80, 0.90],
  clouds: 0.16,
};

const OPEN_HAZE: LookProfile['fog'] = {
  start: 25,
  density: 0.008,
  cap: 0.9,
  height: 0,
  color: null,
};

/**
 * The haze colour the five graded maps were measured on. It used to be their
 * sky's horizon, which tied the dome to the far field: a sky blue enough to
 * read as sky would have moved every one of their section 8 rows. The haze
 * keeps the pair it was graded with and the dome is free.
 */
const GRADED_HAZE: LookProfile['fog'] = { ...OPEN_HAZE, color: [0.74, 0.76, 0.8] };

const NOON_SUN = sun(215, 48);

/**
 * Lorencia's far country: a rocky range over a dry plain, the strip cropped
 * to its painted band so its middle is the art's own skyline.
 *
 * The peaks reach 6.8 degrees over the eye, which is a range a day's walk
 * out rather than a wall at the fence - and the plain below the eye covers
 * the sliver of void the map edge leaves under the horizon.
 */
const LORENCIA_SKYLINE: SkylineLook = {
  art: '/skyline/lorencia_back.webp',
  riseDeg: 6.8,
  dropDeg: 6.2,
  haze: 0.3,
  fade: 0.4,
};

/** Ruins under a heavy deck; Kanturu's two open floors share it. */
const KANTURU_SKY: SkyLook = {
  zenith: [0.46, 0.54, 0.66],
  horizon: [0.7, 0.72, 0.76],
  clouds: 0.28,
  halo: 0.12,
};

/** Karutan: near-clear desert, the disc warm and the halo wide. */
const DESERT_SKY: SkyLook = {
  zenith: [0.56, 0.68, 0.84],
  horizon: [0.88, 0.82, 0.68],
  sun: [1.0, 0.93, 0.78],
  halo: 0.35,
  clouds: 0.08,
};

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

/** An open map that takes the default level and haze and only names its sky. */
const openMap = (sky: SkyLook): LookProfile => ({ ...DEFAULT_PROFILE, sky });

const PROFILES: Partial<Record<ENUM_WORLD, LookProfile>> = {
  [ENUM_WORLD.WD_0LORENCIA]: {
    // Measured (wave 1, Standard mapper): 1.6 lands p50 0.424, 1.8 lands 0.451.
    ev: 1.8,
    whiteBalance: [1.02, 1.0, 0.97],
    sky: { ...OPEN_SKY, skyline: LORENCIA_SKYLINE },
    fog: GRADED_HAZE,
    sun: NOON_SUN,
  },
  [ENUM_WORLD.WD_3NORIA]: {
    ev: 1.5,
    whiteBalance: [0.98, 1.02, 0.98],
    sky: { zenith: [0.30, 0.53, 0.85], horizon: [0.74, 0.83, 0.84], clouds: 0.14 },
    fog: { ...OPEN_HAZE, color: [0.72, 0.78, 0.72] },
    sun: NOON_SUN,
  },
  [ENUM_WORLD.WD_2DEVIAS]: {
    ev: 0.8,
    whiteBalance: [0.97, 0.99, 1.04],
    sky: { zenith: [0.44, 0.62, 0.88], horizon: [0.78, 0.85, 0.92], clouds: 0.28 },
    fog: { start: 20, density: 0.012, cap: 0.9, height: 0.02, color: [0.7, 0.76, 0.86] },
    sun: sun(200, 35),
  },
  [ENUM_WORLD.WD_8TARKAN]: {
    ev: 1.2,
    whiteBalance: [1.04, 1.0, 0.94],
    sky: {
      zenith: [0.40, 0.58, 0.86],
      horizon: [0.90, 0.84, 0.70],
      sun: [1.0, 0.94, 0.8],
      halo: 0.35,
      clouds: 0.06,
    },
    fog: { start: 25, density: 0.01, cap: 0.9, height: 0, color: [0.86, 0.8, 0.66] },
    sun: sun(220, 55),
  },
  [ENUM_WORLD.WD_6STADIUM]: {
    ev: 1.4,
    whiteBalance: [1, 1, 1],
    sky: { ...OPEN_SKY, clouds: 0.12 },
    fog: { start: 25, density: 0.006, cap: 0.8, height: 0, color: [0.74, 0.76, 0.8] },
    sun: sun(215, 50),
  },

  // The remaining open maps (sky_atmospherics §7). Each keeps the ev, fog and
  // sun it has today: only the sky is authored here, against the map's own
  // art rather than against a Lorencia gate.
  [ENUM_WORLD.WD_79UNITEDMARKETPLACE]: openMap({ ...OPEN_SKY, clouds: 0.18 }),
  [ENUM_WORLD.WD_30BATTLECASTLE]: openMap({ ...OPEN_SKY, clouds: 0.16 }),
  [ENUM_WORLD.WD_33AIDA]: openMap({
    zenith: [0.34, 0.42, 0.62],
    horizon: [0.62, 0.66, 0.72],
    clouds: 0.22,
    halo: 0.15,
  }),
  [ENUM_WORLD.WD_34CRYWOLF_1ST]: openMap({
    zenith: [0.45, 0.56, 0.78],
    horizon: [0.72, 0.72, 0.74],
    clouds: 0.24,
  }),
  [ENUM_WORLD.WD_35CRYWOLF_2ND]: openMap({
    zenith: [0.45, 0.56, 0.78],
    horizon: [0.72, 0.72, 0.74],
    clouds: 0.24,
  }),
  [ENUM_WORLD.WD_51ELBELAND]: openMap({
    zenith: [0.48, 0.68, 0.86],
    horizon: [0.76, 0.82, 0.76],
    clouds: 0.14,
  }),
  [ENUM_WORLD.WD_37KANTURU_1ST]: openMap(KANTURU_SKY),
  [ENUM_WORLD.WD_38KANTURU_2ND]: openMap(KANTURU_SKY),
  [ENUM_WORLD.WD_80KARUTAN1]: openMap(DESERT_SKY),
  [ENUM_WORLD.WD_81KARUTAN2]: openMap(DESERT_SKY),
  [ENUM_WORLD.WD_57ICECITY]: openMap({
    zenith: [0.52, 0.64, 0.84],
    horizon: [0.74, 0.8, 0.88],
    clouds: 0.2,
  }),
  [ENUM_WORLD.WD_62SANTA_TOWN]: openMap({
    zenith: [0.5, 0.62, 0.82],
    horizon: [0.8, 0.84, 0.9],
    // A snowfall sky has no disc to show through it.
    sun: null,
    clouds: 0.3,
  }),
  [ENUM_WORLD.WD_56MAP_SWAMP_OF_QUIET]: openMap({
    zenith: [0.4, 0.5, 0.6],
    horizon: [0.68, 0.7, 0.64],
    clouds: 0.26,
    halo: 0.15,
  }),
  [ENUM_WORLD.WD_63PK_FIELD]: openMap({
    zenith: [0.44, 0.44, 0.54],
    horizon: [0.82, 0.66, 0.56],
    sun: [1.0, 0.82, 0.62],
    clouds: 0.24,
  }),
  [ENUM_WORLD.WD_31HUNTING_GROUND]: openMap(OPEN_SKY),
  [ENUM_WORLD.WD_9DEVILSQUARE]: openMap(OPEN_SKY),
  [ENUM_WORLD.WD_18CHAOS_CASTLE]: openMap(OPEN_SKY),
  [ENUM_WORLD.WD_65DOPPLEGANGER1]: openMap(OPEN_SKY),
  [ENUM_WORLD.WD_69EMPIREGUARDIAN1]: openMap({ ...OPEN_SKY, clouds: 0.18 }),
  [ENUM_WORLD.WD_70EMPIREGUARDIAN2]: openMap({ ...OPEN_SKY, clouds: 0.18 }),
  [ENUM_WORLD.WD_71EMPIREGUARDIAN3]: openMap({ ...OPEN_SKY, clouds: 0.18 }),
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
   * The room's level in key units, where 1.0 is the bake at its authored
   * value (§13 F14). It scales the rig, the ground bake and the room's
   * emitters together, so the room keeps the bake's own colour under its
   * candles instead of drowning in the delta at the map's outdoor level.
   */
  readonly keyLevel: number;
  readonly whiteBalance: Rgb;
  /** How much more than the room's own level its emitters get; 1 is Classic. */
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
 * cabin across the river. The room's share now scales the emitters as well as
 * the bake, so the level is one number again: 1.4 lands the pub at p50 0.196
 * against Classic's 0.200 with tex 0.203 against 0.162 (`w3_v2_pub_1.4`).
 */
const LORENCIA_ROOM = room(1.4, 1);

/**
 * Devias rooms (map ev 0.8): the tavern's hearth and door candelabra, the
 * reading room's desk candelabra, the hearth houses, the guard room. The map
 * sits 1.0 ev under Lorencia, so the same room level is a smaller share.
 */
const DEVIAS_ROOM = room(1.3, 1);

/**
 * The two castle halls: twenty tiles across with a colonnade down each side
 * and a handful of wall candelabra, so the candles reach far less of the room
 * than a tavern's do and its own level carries more of the picture.
 *
 * Not gated against Classic the way F14's rooms are, and it cannot be:
 * Classic never opens this roof (only the slabs within the hero's fill lift,
 * F11), so almost no interior surface is comparable between the tiers. On the
 * one that is - the banner wall over the cutaway, same camera - the hall reads
 * 0.81x Classic's mean, a little under. This is the knob if it wants raising.
 */
const DEVIAS_CASTLE_HALL = room(1.45, 1);

const AREAS = {
  lorenciaTavern: LORENCIA_ROOM,
  lorenciaCabin: LORENCIA_ROOM,
  deviasTavern: DEVIAS_ROOM,
  deviasReadingRoom: DEVIAS_ROOM,
  deviasHearthHouse: DEVIAS_ROOM,
  deviasGuardRoom: DEVIAS_ROOM,
  deviasCastleHall: DEVIAS_CASTLE_HALL,
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

/**
 * An event's modifier over whatever map and area are already resolved. An
 * area *replaces* a profile (`applyArea`); an omen only scales it, so the two
 * compose instead of fighting and the map keeps its own look underneath.
 */
export type OmenLook = {
  /** Multiplier on the lit scene's level (`LookState.key.sceneGain`). */
  readonly dim: number;
  /** Composed over the map's balance, then clamped back into range. */
  readonly whiteBalance: Rgb;
};

export const NO_OMEN: OmenLook = { dim: 1, whiteBalance: [1, 1, 1] };

/**
 * A dragon invasion. The original subtracts `(0.3, 0.3, 0.2)` from the terrain
 * light in a 16-tile disc around the hero for as long as the event is lit
 * (GOBoid.cpp:1221-1222): on a mid bake of 0.75 that leaves 0.6 of the level,
 * and it takes more red and green than blue, so what is left is colder than
 * what went in. Both numbers are that subtraction, expressed as a scale
 * because the clone's light has one.
 */
const INVASION: OmenLook = {
  dim: 0.6,
  whiteBalance: [0.97, 0.99, 1.05],
};

const OMENS = {
  invasion: INVASION,
} satisfies Record<string, OmenLook>;

export type OmenLookName = keyof typeof OMENS;

export function omenProfile(name: OmenLookName): OmenLook {
  return OMENS[name];
}

/** The balance range the profile type promises, per channel. */
const BALANCE_MIN = 0.94;
const BALANCE_MAX = 1.06;

/** The map's balance with an omen's laid over it, kept inside the range. */
export function composeBalance(base: Rgb, omen: Rgb): Rgb {
  return [
    Math.min(BALANCE_MAX, Math.max(BALANCE_MIN, base[0] * omen[0])),
    Math.min(BALANCE_MAX, Math.max(BALANCE_MIN, base[1] * omen[1])),
    Math.min(BALANCE_MAX, Math.max(BALANCE_MIN, base[2] * omen[2])),
  ];
}
