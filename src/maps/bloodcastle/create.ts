import type { World } from '../../ecs/world';
import { BloodCastleCandelabraObject } from './candelabraObject';
import { BloodCastleLampObject } from './lampObject';
import {
  BloodCastleBridgeObject,
  BloodCastleGateObject,
} from './gateObject';
import { resetBloodCastleGate } from './gate';
import {
  BLOOD_CASTLE_BRIDGE_TYPES,
  BLOOD_CASTLE_CANDELABRA_TYPE,
  BLOOD_CASTLE_GATE_TYPE,
  BLOOD_CASTLE_LAMP_TYPE,
} from './spec';

/**
 * Blood Castle (`WD_11BLOODCASTLE1` … `_END` and the master-level 52 - eight
 * server instances on one art set, `World12` + `Object12`; see
 * `common/worldAssets.ts`).
 *
 * What the original does per object here, and where each piece went:
 *  - 11 candelabra / 13 lamps: bone-anchored light sprites on a sine
 *    (`RenderObjectVisual`, ZzzObject.cpp:3157-3188) - the two classes.
 *  - 36 the gate, 9/10 the bridge it becomes: `ActionObject`
 *    (ZzzObject.cpp:60-140) - `gate.ts` + `gateObject.ts`. The server clears
 *    the moat's `TW_NOGROUND` when the bridge is earned
 *    (libs/mu/terrainAttributeUpdates), and that clearing is what the fall
 *    watches for.
 *  - 37 smoke vents: `spec.ts` emissions.
 *  - 28/29 (`RenderObject`, ZzzObject.cpp:1041-1057): two statue types drawn
 *    normally and then *again* as a flat black shadow with `HiddenMesh = 2`.
 *    **Not reproduced** - the blob shadow every map object already gets is
 *    the same idea, and a second projected copy of a 4-mesh statue is not
 *    worth a render path of its own.
 *  - The hero's flare motes (`MoveObjectOnEffect`'s `InBloodCastle` branch,
 *    ZzzObject.cpp:4315-4330: a `BITMAP_FLARE` every fourth tick in a 9x9 tile
 *    box around the player, 2.5-3 tiles up) are a hero-relative ambient, so
 *    they live with the weather: `BLOOD_CASTLE_MOTES` in
 *    `weather/ambientWeather.ts`.
 *
 * The Castle Gate and the Statue of Saint are monsters, not map objects:
 * `common/monsters/bloodCastleGate.ts`.
 *
 * Falling off: `deathSystem` already reads the `TW_ACTION` rails at x 13/15
 * (y 16-21) and the moat's `TW_NOGROUND` to pick the fall animation
 * (WSclient.cpp:5440-5487); both flags are in EncTerrain12.att as shipped,
 * so nothing here has to set them.
 *
 * Sound: `iBloodCastle` loops from match state 0 (ambientBeds.ts); no music.
 * Mood: none registered - `MOOD_BY_WORLD` has no row, so the map runs on the
 * default grade plus its own baked lightmap, which is red-brown by design.
 */
export async function createBloodCastle(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const tiles = terrain.MapTileObjects;

  // A fresh instance every warp: the gate stands again.
  resetBloodCastleGate();

  tiles[BLOOD_CASTLE_CANDELABRA_TYPE] = BloodCastleCandelabraObject;
  tiles[BLOOD_CASTLE_LAMP_TYPE] = BloodCastleLampObject;
  tiles[BLOOD_CASTLE_GATE_TYPE] = BloodCastleGateObject;
  for (const type of BLOOD_CASTLE_BRIDGE_TYPES) {
    tiles[type] = BloodCastleBridgeObject;
  }
}
