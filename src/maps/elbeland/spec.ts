import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Elbeland (`WD_51ELBELAND` / `WD_51HOME_6TH_CHAR`, `World52`/`Object52`),
 * the plain-data half. Nothing here may import the scene.
 *
 * EncTerrain52.obj places 5136 objects of 130 types (three type-11 records
 * fall outside the block grid). Object52 ships 165 models; the one type-165
 * record (35.7/241.5) has no `Object166.bmd` and fails its load. The C++ is
 * GMNewTown.cpp (`SEASON3B::GMNewTown`): `CreateObject` (:49-85),
 * `MoveObject` (:87-191), `PlayObjectSound` (:193-232),
 * `RenderObjectVisual` (:234-723).
 */

/**
 * `MoveObject` :127-131, type 56 (×4): `o->BlendMesh = 0; BlendMeshLight =
 * sin(t*0.003)*0.3+0.5; Velocity = 0.05` — the Atlans gate's water sheet
 * (56 is `SE_Amb_enteratlance01`'s object). The sine is in
 * `meshAnimation.ts`, the play speed in `index.ts`.
 */
export const ELBELAND_BLEND_MESHES: Readonly<Record<number, number>> = {
  56: 0,
};

/**
 * Hidden every frame:
 *  - `MoveObject`: **0** (×27, the fire pits — see `ELBELAND_LIGHTS`), **54**
 *    (×37) `WATERFALL_2` one in four (:256-262), **58** (×141)
 *    `WATERFALL_5` every tick (:263-266), **59** (×73) `WATERFALL_3` SubType
 *    8 (:267-270), **60** (×162) `BITMAP_CLOUD` SubType 3 then hidden
 *    (:271-282), **61** (×23, the blue lamps — see lights), **62** (×13) the
 *    eagle spawner (a `Boids[]` slot with `MODEL_EAGLE`, :150-189 — no boid
 *    system here).
 *  - `RenderObjectVisual` :329-360: **133-147** (0 placed except through
 *    148's neighbours) and **149-155** (0 placed) are `CreateMonster` markers
 *    for the decorative town monsters — the server's job in the clone. Kept
 *    in the table so a future .obj that places them stays quiet.
 */
export const ELBELAND_EFFECT_ONLY_TYPES: readonly number[] = [
  0, 54, 58, 59, 60, 61, 62, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142,
  143, 144, 145, 146, 147, 149, 150, 151, 152, 153, 154, 155,
];

/** The falls, the river spray and the mist banks. */
export const ELBELAND_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {
    54: [{ kinds: ['waterfall5_9'], every: 4 }],
    58: [{ kinds: ['waterfall5_9'], every: 1, scale: 0.6 }],
    59: [{ kinds: ['waterfall5_9'], every: 2 }],
    60: [{ kinds: ['cloud21'], every: 8 }],
  };

/**
 * `MoveObject`:
 *  - **0** (×27), :99-104: `L = (rand%4+3)*0.1; AddTerrainLight(x, y,
 *    (L, 0.6L, 0.2L), 3)` + hidden; `RenderObjectVisual` :249-254 adds
 *    `BITMAP_TRUE_FIRE` SubType 0 — the town's fire pits.
 *  - **61** (×23), :132-137: `(0.2L, 0.6L, L)` at range 3 + hidden, with
 *    `BITMAP_TRUE_BLUE` particles (:283-289) — the blue elf lamps.
 *  - **63** (×6), `RenderObjectVisual` :290-299: one `BITMAP_LIGHT` sprite at
 *    bone 5 sized `scale * 6` — the great lanterns; no terrain light.
 *  - **110** (×1) and **121** (×26): `BITMAP_LIGHT` particles / sprites on
 *    bones (:301-327) — the shrine and the lamp posts; sprites only.
 */
export const ELBELAND_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> =
  {
    0: [
      {
        pointRange: 5,
        terrain: {
          range: 3,
          color: [1, 0.6, 0.2],
          flicker: { min: 0.3, max: 0.6, steps: 4 },
        },
        emissions: [{ kinds: ['fire1', 'fire3'], every: 2, jitter: 6 }],
      },
    ],
    61: [
      {
        pointRange: 5,
        terrain: {
          range: 3,
          color: [0.2, 0.6, 1],
          flicker: { min: 0.3, max: 0.6, steps: 4 },
        },
        emissions: [{ kinds: ['wingFlareBlue'], every: 3, scale: 0.6 }],
      },
    ],
    63: [
      {
        offset: [0, 0, 300],
        sprite: { scale: 3, color: [1, 0.9, 0.7] },
      },
    ],
    121: [
      {
        offset: [0, 0, 250],
        sprite: { scale: 1.2, color: [1, 0.9, 0.7] },
      },
    ],
  };
