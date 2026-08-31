import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';
import {
  VULCANUS_EMISSIONS,
  VULCANUS_LIGHTS,
} from '../vulcanus/spec';

/**
 * Doppelganger 2 (`WD_66DOPPLEGANGER2`, `World67`/`Object67`), the plain-data
 * half — Vulcanus' art and Vulcanus' code (`CGMDoppelGanger2`,
 * GMDoppelGanger2.cpp:41-86, is `CGM_PK_Field` with 47/48 added to the
 * hidden list). EncTerrain67.obj: 253 objects, 15 types; Object67 ships 31
 * models, all present.
 *
 * Also an `IsTerrainHeightExtMap` world (24-bit height) and shares the
 * `song_lava1.jpg` slot-11 rule.
 */

export const DOPPELGANGER2_BLEND_MESHES: Readonly<Record<number, number>> = {};

/** `MoveObject` :68-82: 0-6 (the vents) and 47 (×0), 48 (×2). */
export const DOPPELGANGER2_EFFECT_ONLY_TYPES: readonly number[] = [
  0, 1, 2, 3, 4, 5, 6, 47, 48,
];

export const DOPPELGANGER2_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = VULCANUS_EMISSIONS;

export const DOPPELGANGER2_LIGHTS: Partial<
  Record<number, readonly LightEmitter[]>
> = VULCANUS_LIGHTS;
