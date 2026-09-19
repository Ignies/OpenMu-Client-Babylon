import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';
import type { ObjectLoop } from '../../sound/objectLoops';

/**
 * Kalima (`WD_24HELLAS … _END` + Kalima 7 = world 36; one `World25`/`Object25`
 * for all seven floors, `gMapManager.InHellas()`), the plain-data half.
 * Nothing here may import the scene: the shared registries pull these tables
 * in and every one of them is imported by `modelObject`/`mapTileObject`.
 *
 * EncTerrain25.obj places 2314 objects of 56 types; the whole map is one cave
 * system re-used for every floor, the server picks the floor. Object25 ships
 * 59 models and every referenced type has one.
 *
 * The map's C++ lives in GMHellas.cpp: `CreateHellasObject` (:379) is an empty
 * `return false`, `MoveHellasVisual` (:384) hides four marker types, and
 * `RenderHellasVisual` (:429-506) is where the water plants, the glowing
 * crystals and the drip emitters happen. The water plants need a class and
 * are in `create.ts`, which also lists what is not ported.
 */

/**
 * `CreateHellasObject` sets no `o->BlendMesh`; the crystals' glow comes off
 * the mesh flags in the BMD. Exported empty so the table says "checked, none".
 */
export const KALIMA_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveHellasVisual` (GMHellas.cpp:384-396) sets `HiddenMesh = -2` on 37-40,
 * and `RenderHellasVisual` does the same for 35 and 36 every frame. All six
 * are pure emitters:
 *
 *  - **35** (×18) `BITMAP_LIGHT` SubType 6 in `(0.3, 0.6, 1)` - a slow blue
 *    glow rising out of the floor.
 *  - **36** (×6, scale forced to 0.5) `BITMAP_TRUE_BLUE` SubType 0.
 *  - **37** (×62) `BITMAP_WATERFALL_5` every tick, **38** (×25)
 *    `BITMAP_WATERFALL_1` one tick in two, **39** (×52) `WATERFALL_3/4`
 *    every tick, **40** (×50) `WATERFALL_2` one in four - the cave drips and
 *    the small falls, all at the forced 0.5 scale.
 */
export const KALIMA_EFFECT_ONLY_TYPES: readonly number[] = [
  35, 36, 37, 38, 39, 40,
];

/**
 * The emitters above. `waterfall5_9` is the only falling kind in
 * `effectParticles` and stands in for all four waterfall bitmaps (the same
 * substitution Tarkan 70 and Dungeon 52 make); `wingFlareBlue` is the closest
 * thing to the blue `BITMAP_LIGHT`/`TRUE_BLUE` glow - same additive blue
 * flare, but it drifts sideways rather than rising.
 */
export const KALIMA_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  35: [{ kinds: ['wingFlareBlue'], every: 2, light: [0.3, 0.6, 1] }],
  36: [{ kinds: ['wingFlareBlue'], every: 3, scale: 0.5 }],
  37: [{ kinds: ['waterfall5_9'], every: 1, scale: 0.5 }],
  38: [{ kinds: ['waterfall5_9'], every: 2, scale: 0.5 }],
  39: [{ kinds: ['waterfall5_9'], every: 1, scale: 0.5 }],
  40: [{ kinds: ['waterfall5_9'], every: 4, scale: 0.5 }],
};

/**
 * `PlayBuffer(SOUND_KALIMA_WATER_FALL)` on every rendered type 37 (×62) and
 * 38 (×25) (GMHellas.cpp:479, :487) - `Data/Sound/aKalimaWaterFall.wav`,
 * loaded with three buffers (MapManager.cpp:994). Types 39 and 40, the two
 * silent drips, do not sound.
 *
 * The original plays it unpositioned, so one visible fall is heard at full
 * volume wherever the hero stands. With 87 sources on one map that is a wall
 * of water, so this fades: full inside four tiles, gone at twenty. The reach
 * is the only invented number here.
 *
 * Read by `sound/objectLoops.ts`, which has no Kalima row yet - see the port
 * notes for the registry line this wants.
 */
export const KALIMA_OBJECT_LOOPS: readonly ObjectLoop[] = [
  {
    types: [37, 38],
    sound: 'Sound/aKalimaWaterFall',
    gain: 0.35,
    full: 4,
    silent: 20,
  },
];

/**
 * `RenderHellasVisual` case 12 (×49) and 32 (×19): a `BITMAP_LIGHT` sprite
 * at bone 5, `(0.6, 0.6, 1)`, sized `sin(t * 0.001) * 0.3 + 0.7 + 0.2` - the
 * glowing crystal clusters. No `AddTerrainLight` anywhere on this map, so no
 * `terrain` block and no point light; the flare is the whole effect.
 *
 * The bone-5 rest offset has not been read out of the GLBs, so the flare sits
 * at the object origin; the crystals are compact enough (1-2 tiles) that it
 * lands inside them.
 */
export const KALIMA_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  12: [
    {
      sprite: {
        scale: 1.6,
        color: [0.6, 0.6, 1],
        pulse: { speed: 1, amount: 0.3, base: 0.9 },
      },
    },
  ],
  32: [
    {
      sprite: {
        scale: 1.6,
        color: [0.6, 0.6, 1],
        pulse: { speed: 1, amount: 0.3, base: 0.9 },
      },
    },
  ],
};
