import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Swamp of Calmness (`WD_56MAP_SWAMP_OF_QUIET`, `World57`/`Object57`), the
 * plain-data half. Nothing here may import the scene.
 *
 * EncTerrain57.obj places 4176 objects of 87 types (fourteen records outside
 * the block grid). Object57 ships 91 models; types 58, 59 and 64 (one record
 * each, by the shrine at 15/83 and 12/110) have no model. The C++ is
 * GMSwampOfQuiet.cpp: `CreateObject` (:51-63, empty — the 103 operate box is
 * commented out), `MoveObject` (:66-104), `RenderObjectVisual` (:127-199).
 */

/** No `o->BlendMesh` writes in the Swamp code. */
export const SWAMP_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :78-102 hides 57, 71, 72, 73, 74, 77, 78:
 *  - **57** (×18): the brazier — see `SWAMP_LIGHTS`.
 *  - **71** (×8): `BITMAP_TRUE_FIRE` SubType 5 — fire without light.
 *  - **72** (×59): `BITMAP_SMOKE` SubType 49 from an offset — marsh gas.
 *  - **73** (×51): hidden, nothing drawn.
 *  - **74** (×11): `BITMAP_SMOKE` SubType 21 at twice scale.
 *  - **77** (×87), **78** (×117): `BITMAP_CLOUD` SubType 20 — the fog
 *    banks that make the map.
 */
export const SWAMP_EFFECT_ONLY_TYPES: readonly number[] = [
  57, 71, 72, 73, 74, 77, 78,
];

/**
 * The vents. 77/78 are 204 emitters — the cloud rate is kept low (one in
 * eight) because they sit in every direction at once.
 */
export const SWAMP_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  71: [{ kinds: ['fire1', 'fire2'], every: 3, light: [1, 0.6, 0.3] }],
  72: [{ kinds: ['smoke21'], every: 4 }],
  74: [{ kinds: ['smoke21'], every: 4, scale: 2 }],
  77: [{ kinds: ['cloud21'], every: 8 }],
  78: [{ kinds: ['cloud21'], every: 8 }],
};

/**
 * Type 57 (×18), `MoveObject` :78-83: `L = (rand%4+3)*0.1;
 * AddTerrainLight(x, y, (L, 0.6L, 0.2L), 3)` + hidden; the render side
 * (:136-145) adds `TRUE_FIRE` SubType 5 and `SMOKE` SubType 21.
 */
export const SWAMP_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  57: [
    {
      pointRange: 5,
      terrain: {
        range: 3,
        color: [1, 0.6, 0.2],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
      },
      emissions: [
        { kinds: ['fire1', 'fire3'], every: 2, jitter: 6 },
        { kinds: ['smoke21'], every: 6 },
      ],
    },
  ],
};
