import type { Emission } from '@/controllers/fx/effectParticles';
import type { LightEmitter } from '@/controllers/lighting/mapObjectLights';
import {
  KANTURU1_EMISSIONS,
  KANTURU1_LIGHTS,
} from '../kanturu1/spec';

/**
 * Doppelganger 4 (`WD_68DOPPLEGANGER4`, `World69`/`Object69`), the plain-data
 * half - Kanturu Ruins' art and a line-for-line copy of its `MoveObject`
 * (GMDoppelGanger4.cpp:61-133) with 47/48 added to the hidden list.
 * EncTerrain69.obj: 433 objects, 38 types; Object69 ships 61 models and the
 * two type-34 records and the one 175 have none.
 */

export const DOPPELGANGER4_BLEND_MESHES: Readonly<Record<number, number>> = {};

export const DOPPELGANGER4_EFFECT_ONLY_TYPES: readonly number[] = [
  47, 48, 59, 60, 61, 62, 81, 82, 83, 97, 107, 108,
];

/**
 * Types EncTerrain69.obj places with no model: 34 (×2 at 98/53-54, no Object35.bmd in `Data/Object69`)
 * and 175 (×1 at 37/101), past `MAX_WORLD_OBJECTS`, so no folder slot: `MODEL_BIRD01`, which only
 * Lorencia loads (MapManager.cpp:46). `AccessModel` fails and `Open2` leaves the slot empty
 * (LoadData.cpp:22-49, ZzzBMD.cpp:3098-3116), so the original draws nothing there; unbound, each asked
 * for a GLB the data never had and logged "Could not load model".
 */
export const DOPPELGANGER4_ABSENT_MODELS: readonly number[] = [34, 175];

/**
 * Kanturu's rows but 59, which `RenderObjectVisual` makes a `BITMAP_SMOKE` SubType 13 one tick in
 * three, not Kanturu's SubType 21 (GMDoppelGanger4.cpp:399-405), and the falls 82 and 83:
 * `BITMAP_WATERFALL_3` SubType 3 every tick and `BITMAP_WATERFALL_2` SubType 1 one in three, not
 * SubType 4 and 2 (:439-447). EncTerrain69.obj places none of the three. Its own 48 (×2), the
 * sky-blue light box, makes a `BITMAP_LIGHT` SubType 15 in `(0.6, 0.8, 1.0)` one tick in three
 * (:387-398).
 */
export const DOPPELGANGER4_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {
  ...KANTURU1_EMISSIONS,
  48: [{ kinds: ['light15'], every: 3, light: [0.6, 0.8, 1] }],
  59: [{ kinds: ['smoke13'], every: 3 }],
  82: [{ kinds: ['waterfall3_3'], every: 1 }],
  83: [{ kinds: ['waterfall2_1'], every: 3 }],
};

export const DOPPELGANGER4_LIGHTS: Partial<
  Record<number, readonly LightEmitter[]>
> = KANTURU1_LIGHTS;
