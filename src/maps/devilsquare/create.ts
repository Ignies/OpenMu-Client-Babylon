import type { World } from '../../ecs/world';
import { DevilSquareStorm } from './storm';

/**
 * Devil Square (`WD_9DEVILSQUARE` plus OpenMU's map 32, `World10`/`Object10`).
 *
 * Nothing on this map needs a per-object class. `CreateObject` has no case
 * for it, so no type gets a blend mesh, an operate box or a hidden marker;
 * `MoveObject`'s only Devil Square code is world-level rather than per-type;
 * and the one `RenderObjectVisual` case - the rain ripples off the enemy
 * rank's shoulders - is documented and deliberately skipped in `spec.ts`.
 * All seven types are the default `MapTileObject`.
 *
 * What is left is `DevilSquareStorm`: the lightning in `MoveObject`
 * (ZzzObject.cpp:3630-3644), hero-relative and with no emitter to hang off,
 * the way Icarus's `MoveHeavenThunder` is.
 *
 * What lives outside this directory, and why:
 *  - the rain: the weather layer, forced on for this world whatever the
 *    packet says (`ALWAYS_RAINING`, `weather/rainState.ts`), because
 *    `CreateDevilSquareRain` (ZzzEffectFireLeave.cpp:120-127) gates on the
 *    world alone and `MoveLeaves` gives it the full `MAX_LEAVES` budget
 *    (:428).
 *  - the `aRain` bed and the silence where a map track would be:
 *    `sound/ambientBeds.ts` and `sound/music.ts`.
 *  - the waves, the timer and the rank table: the event, not the map.
 */
export async function createDevilSquare(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const storm = new DevilSquareStorm(world);

  // `unloadMap` calls `onDispose` on every entity belonging to the world it
  // is leaving, which is the only teardown hook a map module gets.
  world.add({
    worldIndex: world.mapIndex,
    onDispose: () => storm.dispose(),
  });
}
