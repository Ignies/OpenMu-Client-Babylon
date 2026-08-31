import type { World } from '../../ecs/world';
import { mapMusic, sound } from '../../sound';
import { setAreaMood } from '../../scenes/sceneLook';
import { LeanBoxObject } from '../../common/operateBoxObject';
import { DeviasCandleObject } from './candleObject';
import {
  DEVIAS_EAST_HEARTH_HOUSE,
  DEVIAS_READING_ROOM,
  DEVIAS_TAVERN,
  DEVIAS_WEST_HEARTH_HOUSE,
} from './rooms';
import type { Room } from './rooms';

/**
 * Devias (World 3 / Object3). The original lights nothing indoors here;
 * the candelabra, hearth fire, warm interior grade, pub music and dust are
 * the Lorencia tavern treatment applied to the two rooms by the spawn
 * (see rooms.ts). Dust lives in AmbientParticleSystem.
 */
export async function createDevias(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  const map = world.mapIndex;
  const tiles = terrain.MapTileObjects;

  tiles[54] = DeviasCandleObject;
  tiles[56] = DeviasCandleObject;
  // Devias 91: CreateOperate + HiddenMesh = -2 + the fixed (40,40,160) box
  // (ZzzObject.cpp:4652-4655) — the shared operate-box recipe, on Object92.
  tiles[91] = LeanBoxObject;

  world.add({
    worldIndex: map,
    interactiveArea: {
      min: DEVIAS_TAVERN.min,
      max: DEVIAS_TAVERN.max,
      onEnter: () => {
        sound.playMusic('Music/Pub');
        setAreaMood('deviasTavern');
      },
      onLeave: () => {
        sound.playMusic(mapMusic(map) ?? 'Music/Devias');
        setAreaMood(null);
      },
    },
    onDispose: () => {
      sound.stop('Music/Pub');
      setAreaMood(null);
    },
  });

  // Reading room and the two fireplace houses share one treatment: step in,
  // the cold grade gives way to the warm interior one. The tavern keeps its
  // extra pub-music trigger above; these three are lit by their hearth alone.
  const warmRooms: Room[] = [
    DEVIAS_READING_ROOM,
    DEVIAS_WEST_HEARTH_HOUSE,
    DEVIAS_EAST_HEARTH_HOUSE,
  ];

  for (const room of warmRooms) {
    world.add({
      worldIndex: map,
      interactiveArea: {
        min: room.min,
        max: room.max,
        onEnter: () => setAreaMood('deviasTavern'),
        onLeave: () => setAreaMood(null),
      },
      onDispose: () => setAreaMood(null),
    });
  }
}
