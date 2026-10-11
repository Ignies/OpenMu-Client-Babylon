import type { LookProfile, SkyLook, SunSpec } from '@/controllers/lighting';

/**
 * Building blocks the maps' look rows (`MapLighting.look`) share. Plain data.
 * A row is laid over the lighting controller's open (or enclosed) default,
 * so it only names what differs.
 */

/** Open sky's key share: the lighting controller's `OPEN_SUN_SHARE`. */
const OPEN_SUN_SHARE = 0.6;
/** Under a roof the bake carries the room: the controller's `ENCLOSED_SUN_SHARE`. */
export const ENCLOSED_SUN_SHARE = 0.15;

export const sun = (
  azimuthDeg: number,
  elevationDeg: number,
  share = OPEN_SUN_SHARE
): SunSpec => ({ azimuthDeg, elevationDeg, share });

/** The open default's sky, for a map that only moves its clouds. */
export const OPEN_SKY: SkyLook = {
  zenith: [0.34, 0.55, 0.87],
  horizon: [0.72, 0.80, 0.90],
  clouds: 0.16,
};

/** No haze pass at all. */
export const NO_FOG: LookProfile['fog'] = {
  start: 0,
  density: 0,
  cap: 0,
  height: 0,
  color: null,
};

/** The open default's haze. */
export const OPEN_HAZE: LookProfile['fog'] = {
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
export const GRADED_HAZE: LookProfile['fog'] = { ...OPEN_HAZE, color: [0.74, 0.76, 0.8] };

/** The open default's noon sun. */
export const NOON_SUN = sun(215, 48);

/** Ruins under a heavy deck; Kanturu's two open floors share it. */
export const KANTURU_SKY: SkyLook = {
  zenith: [0.46, 0.54, 0.66],
  horizon: [0.7, 0.72, 0.76],
  clouds: 0.28,
  halo: 0.12,
};

/** Karutan: near-clear desert, the disc warm and the halo wide. */
export const DESERT_SKY: SkyLook = {
  zenith: [0.56, 0.68, 0.84],
  horizon: [0.88, 0.82, 0.68],
  sun: [1.0, 0.93, 0.78],
  halo: 0.35,
  clouds: 0.08,
};
