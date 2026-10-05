import type { Emission } from '@/controllers/fx/effectParticles';
import type { LightEmitter } from '@/controllers/lighting/mapObjectLights';
import type { MeshAnimations } from '@/controllers/render';
import { isOn } from '@/controllers/fidelity';
import { perTick } from '../shared/meshAnimation';

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
 * sin(t*0.003)*0.3+0.5; Velocity = 0.05` - the Atlans gate's water sheet
 * (56 is `SE_Amb_enteratlance01`'s object). The sine is in
 * the `render.meshAnimations` rows, the play speed in `index.ts`.
 */
export const ELBELAND_BLEND_MESHES: Readonly<Record<number, number>> = {
  56: 0,
};

/**
 * Hidden every frame:
 *  - `MoveObject`: **0** (×27, the fire pits - see `ELBELAND_LIGHTS`), **54**
 *    (×37) `WATERFALL_2` one in four (:256-262), **58** (×141)
 *    `WATERFALL_5` every tick (:263-266), **59** (×73) `WATERFALL_3` SubType
 *    8 (:267-270), **60** (×162) `BITMAP_CLOUD` SubType 3 then hidden
 *    (:271-282), **61** (×23, the blue lamps - see lights), **62** (×13) the
 *    eagle spawner (a `Boids[]` slot with `MODEL_EAGLE`, :150-189 - no boid
 *    system here).
 *  - `RenderObjectVisual` :329-360: **133-147** (0 placed except through
 *    148's neighbours) and **149-155** (0 placed) are `CreateMonster` markers
 *    for the decorative town monsters - the server's job in the clone. Kept
 *    in the table so a future .obj that places them stays quiet.
 *  - **165** (×1, at 35.7/241.5): Object52 ships 165 models, so the highest
 *    type with art is 164. The original loads no `Object166.bmd` for it
 *    either and draws nothing; listing it here skips the fetch instead of
 *    failing it twice per load.
 */
export const ELBELAND_EFFECT_ONLY_TYPES: readonly number[] = [
  0, 54, 58, 59, 60, 61, 62, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142,
  143, 144, 145, 146, 147, 149, 150, 151, 152, 153, 154, 155, 165,
];

/**
 * The falls and the river spray.
 *
 * **60** emits nothing. `RenderObjectVisual` :271-282 spawns ten
 * `BITMAP_CLOUD` SubType 3 at light `(0.06, 0.07, 0.08)` and latches
 * `HiddenMesh = -2` so it can never run a second time; SubType 3 has no init
 * and no move case, so those ten keep `CreateParticle`'s default
 * `LifeTime = 2` (ZzzEffectParticle.cpp:74) and are gone in two ticks. One
 * near-black two-tick flash per object is nothing to draw, and this map
 * places 162 of them around the island rim - a stream of white `cloud21`
 * instead buried the whole town in cloud.
 */
export const ELBELAND_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {
    54: [{ kinds: ['waterfall5_9'], every: 4 }],
    58: [{ kinds: ['waterfall5_9'], every: 1, scale: 0.6 }],
    59: [{ kinds: ['waterfall5_9'], every: 2 }],
  };

/**
 * `MoveObject`:
 *  - **0** (×27), :99-104: `L = (rand%4+3)*0.1; AddTerrainLight(x, y,
 *    (L, 0.6L, 0.2L), 3)` + hidden; `RenderObjectVisual` :249-254 adds
 *    `BITMAP_TRUE_FIRE` SubType 0 one tick in three (`trueFire`) - the
 *    town's fire pits.
 *  - **61** (×23), :135-140: `(0.2L, 0.6L, L)` at range 3 + hidden, with a
 *    `BITMAP_TRUE_BLUE` particle one tick in three (`trueBlue`, :282-288) -
 *    the blue elf lamps. No sprite: the flare is ours (`lampFlares`).
 *  - **63** (×6), `RenderObjectVisual` :289-300: one `BITMAP_LIGHT` sprite at
 *    bone 5 + (-40, -10, 0) sized `scale * 6`, `fLumi * (1, 1, 0.6)` with
 *    `fLumi = (sin(WorldTime * 0.001) + 1) * 0.3 + 0.4` - the great lanterns;
 *    no terrain light. The lantern swings 27 across; the card sits at the
 *    middle of the swing.
 *  - **110** (×1, at 47.5/218.5), `RenderObjectVisual` :301-311: one
 *    `BITMAP_LIGHT` particle every other tick at
 *    `(cos, sin)(WorldTime * 0.03) * (30 + rand()%5)` around bone 0, 70 up
 *    in its frame - 31 over the origin, as bone 0 sits 39 under it - scale
 *    0.6, white - the village-protection shrine. 0.03 rad/ms is 4.8
 *    turns a second against 12.5 spawns, so consecutive sparks land 138°
 *    apart and the ring never reads as an orbit in the original either: what
 *    it looks like is a light hanging over the shrine, which is the sprite
 *    below.
 *  - **121** (×26), :312-327: a `BITMAP_LIGHT` sprite on each of bones 3…8
 *    + (5, -4, -1) of the totem, `fLumi * (1, 0.5, 0.3)` and `fLumi` across
 *    with no `* o->Scale`, `fLumi = (sin(WorldTime * 0.002) + 1) * 0.5 + 0.5`.
 */
const FIRE_BOWL_FLARE: NonNullable<LightEmitter['sprite']> = { scale: 0.9, color: [0.2, 0.5, 1] };

/**
 * Ours (`lampFlares`): every 61 record sits 11 west and 8 north of the bowl it belongs to (its
 * type-34 post), so the flame burned beside the rim; this puts its base inside the bowl. Classic
 * burns and lights at `o->Position`, as the original (GMNewTown.cpp:135-140, :282-288).
 */
const FIRE_BOWL_DROP: readonly [number, number, number] = [11, -8, -10];

const TOTEM_LUMI = { speed: 0.002, amount: 0.5, base: 0.5 } as const;

const TOTEM_LIGHT: NonNullable<LightEmitter['sprite']> = {
  scale: 1,
  color: [1, 0.5, 0.3],
  pulse: TOTEM_LUMI,
  grow: TOTEM_LUMI,
  unscaled: true,
};

/** The totem's bones 3-8 + (5, -4, -1), at scale 1. */
const TOTEM_BONES: readonly (readonly [number, number, number])[] = [
  [-12, 11, 348],
  [-12, -13, 348],
  [-17, 13, 232],
  [-20, 17, 105],
  [-20, -19, 105],
  [-17, -16, 232],
];

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
        emissions: [{ kinds: ['trueFire'], every: 3 }],
      },
    ],
    61: [
      {
        // `pointDrop` keeps the pool's default 0.6 hover, which an `offset` takes away.
        get offset() {
          return isOn('lampFlares') ? FIRE_BOWL_DROP : undefined;
        },
        pointDrop: 0.6,
        get sprite() {
          return isOn('lampFlares') ? FIRE_BOWL_FLARE : undefined;
        },
        pointRange: 5,
        terrain: {
          range: 3,
          color: [0.2, 0.6, 1],
          flicker: { min: 0.3, max: 0.6, steps: 4 },
        },
        // One `BITMAP_TRUE_BLUE` one tick in three, white, at the lamp's scale (:282-288).
        emissions: [{ kinds: ['trueBlue'], every: 3 }],
      },
    ],
    63: [
      {
        offset: [10, -167, 415],
        bone: true,
        sprite: { scale: 6, color: [1, 1, 0.6], pulse: { speed: 0.001, amount: 0.3, base: 0.4 } },
      },
    ],
    110: [
      {
        offset: [0, 0, 31],
        bone: true,
        sprite: { scale: 1.2, color: [1, 1, 1] },
      },
    ],
    121: TOTEM_BONES.map(offset => ({ offset, bone: true, sprite: TOTEM_LIGHT })),
  };

/**
 * Elbeland (GMNewTown.cpp:105-149): the river (2), ravine (53), channel
 * (55) and waterway (89) sheets scroll V up `0.015`/tick (89: `0.005`);
 * 56 is the Atlans-gate water's breathing glow.
 */
export const ELBELAND_MESH_ANIMATIONS: MeshAnimations = {
  2: { mesh: 0, kind: 'blend', v: perTick(0.015) },
  53: { mesh: 0, kind: 'blend', v: perTick(0.015) },
  55: { mesh: 0, kind: 'blend', v: perTick(0.015) },
  56: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.003) * 0.3 + 0.5 },
  89: { mesh: 0, kind: 'blend', v: perTick(0.005) },
};
