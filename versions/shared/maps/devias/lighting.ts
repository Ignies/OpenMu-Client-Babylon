import type { MapLighting } from '@/controllers/lighting';
import { sun } from '../shared/looks';
import { DEVIAS_LIGHTS } from './spec';

/**
 * Devias rooms (map ev 0.8): the tavern's hearth and door candelabra, the
 * reading room's desk candelabra, the hearth houses, the guard room. The map
 * sits 1.0 ev under Lorencia, so the same room level is a smaller share.
 */
const DEVIAS_ROOM = { keyLevel: 1.3, candles: 1 };

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
const DEVIAS_CASTLE_HALL = { keyLevel: 1.45, candles: 1 };

/** Devias' lighting (`MapLayer.lighting`), read by the lighting controller. */
export const DEVIAS_LIGHTING: MapLighting = {
  look: {
    ev: 0.8,
    whiteBalance: [0.97, 0.99, 1.04],
    sky: { zenith: [0.44, 0.62, 0.88], horizon: [0.78, 0.85, 0.92], clouds: 0 },
    fog: { start: 20, density: 0.012, cap: 0.9, height: 0.02, color: [0.7, 0.76, 0.86] },
    // `top` is 0: the shallowest tile anyone can stand on here is 0.135, so
    // none of the snow field is over it and none of it changes. The cliff
    // faces along the ravines hang to about eight tiles under that, and the
    // numbers are set so they are half gone by four - which is the fade the
    // original's crevasses have, seen from the rim.
    underworld: { top: 0, density: 0.075, falloff: 0.25, color: [0, 0, 0] },
    sun: sun(200, 35),
  },
  areas: {
    deviasTavern: DEVIAS_ROOM,
    deviasReadingRoom: DEVIAS_ROOM,
    deviasHearthHouse: DEVIAS_ROOM,
    deviasGuardRoom: DEVIAS_ROOM,
    deviasCastleHall: DEVIAS_CASTLE_HALL,
  },
  objectLights: DEVIAS_LIGHTS,
};
