import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Duel Arena (`WD_64DUELARENA`, `World65`/`Object65`), the plain-data half.
 * Nothing here may import the scene.
 *
 * EncTerrain65.obj places 1347 objects of 31 types. **Object65 has one
 * hole**: it ships 30 models, `Object01`-`Object25` and `Object33`-`Object37`
 * (types 0-24 and 32-36), and type 39 (×2, the far north-east corner) has no
 * `Object40.bmd` - its load fails and is logged. Nothing in the C++ touches
 * 39 either.
 *
 * The C++ is GMDuelArena.cpp: `CreateObject` (:33-43), `MoveObject` (:58-80),
 * `RenderObjectVisual` (:116-159). `RenderObjectMesh` (:104-114) and
 * `RenderAfterObjectMesh` (:171) are empty, `CreateMonster` (:45-55) returns
 * null, and `CreateObject` spawns nothing - the map owns no entity of its
 * own, hence no `create.ts`.
 */

/** No `o->BlendMesh` writes, and no UV scroll or `BlendMeshLight` either. */
export const DUEL_ARENA_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :65-69 hides 35 (×34) and 36 (×59); :71-79 hides 34 (×131),
 * the brazier below. All three are markers the render side draws effects
 * over:
 *
 *  - **34** (×131): the terrain light and nothing else - `RenderObjectVisual`
 *    :120-121 is a bare `break`. See `DUEL_ARENA_LIGHTS`.
 *  - **35** (×34): `BITMAP_SMOKE` SubType 14 one tick in three (:122-131).
 *  - **36** (×59): a `BITMAP_LIGHT` flare and a fire plume every tick
 *    (:132-155). See `DUEL_ARENA_LIGHTS`.
 */
export const DUEL_ARENA_EFFECT_ONLY_TYPES: readonly number[] = [34, 35, 36];

/**
 * Type 35 (×34), `RenderObjectVisual` :122-131: `if (rand_fps_check(3))
 * CreateParticle(BITMAP_SMOKE, …, 14, o->Scale, o)` at white.
 *
 * SubType 14 has no kind of its own in `effectParticles`; `smoke2` is the
 * nearest that exists - the same subtractive blend and the same 50-tick life,
 * drifting rather than sinking (SubType 14 falls a unit a frame from a start
 * point up to 96 units above the marker).
 */
export const DUEL_ARENA_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {
    35: [{ kinds: ['smoke2'], every: 3, jitter: 8 }],
  };

/**
 * `MoveObject` :71-79, type 34 (×131): `L = (rand%3+5)*0.1;
 * AddTerrainLight(x, y, (0.9L, 0.2L, 0.1L), 3)` + hidden - a deep-red
 * brazier, brighter and steadier than the Kanturu one (0.5-0.7 rather than
 * 0.3-0.6). 131 of them ring the four arenas. It carries no flame: the
 * render side's case 34 is an empty `break`, so the light is all there is.
 *
 * `RenderObjectVisual` :132-155, type 36 (×59): `CreateSprite(BITMAP_LIGHT,
 * pos, 2.0 * o->Scale, (1, 0.2, 0))` and then one of `FIRE_HIK1` SubType 0,
 * `FIRE_CURSEDLICH` SubType 4 or `FIRE_HIK3` SubType 0 by `rand()%3`, white,
 * once a tick - `fire1` / `fire2` / `fire3` here, picked the same way. No
 * `AddTerrainLight` anywhere near it, so the row has no `terrain` block and
 * throws no light; the flare card and the plume are the whole of it. 59 more
 * pools on a map that already carries 131 would be the change, not the port.
 */
export const DUEL_ARENA_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> =
  {
    34: [
      {
        pointRange: 5,
        terrain: {
          range: 3,
          color: [0.9, 0.2, 0.1],
          flicker: { min: 0.5, max: 0.7, steps: 3 },
        },
      },
    ],
    36: [
      {
        sprite: { scale: 2, color: [1, 0.2, 0] },
        emissions: [{ kinds: ['fire1', 'fire2', 'fire3'], every: 1 }],
      },
    ],
  };
