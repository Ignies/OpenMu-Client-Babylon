import type { MapLighting, SkylineLook } from '@/controllers/lighting';
import { GRADED_HAZE, NOON_SUN, OPEN_SKY } from '../shared/looks';
import { LORENCIA_LIGHTS } from './spec';

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

/**
 * Lorencia rooms (map ev 1.8): the pub with candelabra on every table, the
 * cabin across the river. The room's share now scales the emitters as well as
 * the bake, so the level is one number again: 1.4 lands the pub at p50 0.196
 * against Classic's 0.200 with tex 0.203 against 0.162 (`w3_v2_pub_1.4`).
 */
const LORENCIA_ROOM = { keyLevel: 1.4, candles: 1 };

/** Lorencia's lighting (`MapLayer.lighting`), read by the lighting controller. */
export const LORENCIA_LIGHTING: MapLighting = {
  look: {
    // Measured (wave 1, Standard mapper): 1.6 lands p50 0.424, 1.8 lands 0.451.
    ev: 1.8,
    whiteBalance: [1.02, 1.0, 0.97],
    sky: { ...OPEN_SKY, skyline: LORENCIA_SKYLINE },
    fog: GRADED_HAZE,
    sun: NOON_SUN,
  },
  areas: {
    lorenciaTavern: LORENCIA_ROOM,
    lorenciaCabin: LORENCIA_ROOM,
  },
  objectLights: LORENCIA_LIGHTS,
};
