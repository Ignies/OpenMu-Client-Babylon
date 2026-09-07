import type { World } from '../../ecs/world';
import { mapMusic, sound } from '../../sound';
import { setAreaMood } from '../../scenes/sceneLook';
import type { AreaLookName } from '../../lighting/profiles';
import { LeanBoxObject } from '../../common/operateBoxObject';
import { DeviasCandleObject } from './candleObject';
import {
  enumerateRooms,
  loadRoomRecords,
  registerRooms,
  sameRoom,
  type RoomHooks,
} from '../rooms';
import {
  DEVIAS_CASTLE_HALLS,
  DEVIAS_CASTLE_SPEC,
  DEVIAS_EAST_HEARTH_HOUSE,
  DEVIAS_READING_ROOM,
  DEVIAS_ROOM_SPEC,
  DEVIAS_TAVERN,
  DEVIAS_WEST_HEARTH_HOUSE,
} from './rooms';
import type { Room } from './rooms';
import type { RoomFrame } from '../roomEnumeration';

/**
 * Devias (World 3 / Object3). The original lights nothing indoors here;
 * the candelabra, hearth fire, warm interior grade, pub music and dust are
 * the Lorencia tavern treatment applied to every roofed building the hero
 * can walk into (see rooms.ts), the two castle halls included. Dust lives in
 * AmbientParticleSystem.
 */
export async function createDevias(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const map = world.mapIndex;
  const tiles = terrain.MapTileObjects;

  tiles[54] = DeviasCandleObject;
  tiles[56] = DeviasCandleObject;
  // Devias 91: CreateOperate + HiddenMesh = -2 + the fixed (40,40,160) box
  // (ZzzObject.cpp:4652-4655) - the shared operate-box recipe, on Object92.
  tiles[91] = LeanBoxObject;

  const tavern: RoomHooks = {
    look: 'deviasTavern',
    onEnter: () => sound.playMusic('Music/Pub'),
    onLeave: () => sound.playMusic(mapMusic(map) ?? 'Music/Devias'),
  };

  // The rooms someone tuned keep their rows; the rest take the shared one.
  const tuned: [Room, AreaLookName][] = [
    [DEVIAS_READING_ROOM, 'deviasReadingRoom'],
    [DEVIAS_WEST_HEARTH_HOUSE, 'deviasHearthHouse'],
    [DEVIAS_EAST_HEARTH_HOUSE, 'deviasHearthHouse'],
  ];

  const hooksFor = (room: Room): RoomHooks => {
    if (sameRoom(room, DEVIAS_TAVERN)) return tavern;
    const row = tuned.find(([known]) => sameRoom(room, known));

    return { look: row ? row[1] : 'deviasGuardRoom' };
  };

  world.add({
    worldIndex: map,
    onDispose: () => {
      sound.stop('Music/Pub');
      setAreaMood(null);
    },
  });

  const records = await loadRoomRecords(map);

  // Two kits, so two passes: the houses' spec finds the roofed buildings, the
  // castles' finds the two halls. One spec cannot do both - the castle kit
  // stands a storey taller and its walls sit the other side of their line.
  const houses = enumerateRooms(records, DEVIAS_ROOM_SPEC);
  registerRooms(world, houses, DEVIAS_ROOM_SPEC, hooksFor);

  // A castle's wall line does not bound its floor the way a house's does (see
  // rooms.ts), so the enumeration is used to find the halls and read their
  // base, and each then takes its own floor.
  const hallFloor = (hall: RoomFrame): RoomFrame => {
    const row = DEVIAS_CASTLE_HALLS.find(known => sameRoom(hall, known));

    return row ? { ...row, base: hall.base } : hall;
  };

  const halls = enumerateRooms(records, DEVIAS_CASTLE_SPEC).map(hallFloor);
  registerRooms(world, halls, DEVIAS_CASTLE_SPEC, () => ({
    look: 'deviasCastleHall',
  }));
}
