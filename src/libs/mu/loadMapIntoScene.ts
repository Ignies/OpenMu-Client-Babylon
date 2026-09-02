import { ENUM_WORLD } from '../../common';
import type { World } from '../../ecs/world';
import { Store } from '../../store';
import { maps } from '../../maps';
// Side effect: the `ChangeTerrainAttributes` packet → `world.setTerrainFlags`.
import './terrainAttributeUpdates';
import {
  disposePreparedTerrain,
  getTerrainData,
  prepareTerrain,
  type PreparedTerrain,
} from './getTerrainData';
import { applyMapObjectFixups } from './mapObjectFixups';
import { evictContainers } from '../../common/modelLoader';
import { assetWorldNum } from '../../common/worldAssets';
import { Color4, Vector3 } from '../babylon/exports';
import { toRadians } from '../../common/utils';
import { MapTileObject } from '../../common/mapTileObject';
import { IVector3Like } from '../babylon/exports';
import { EventBus } from '../eventBus';
import { DISABLE_OBJECTS_LOADING } from '../../consts';
import { sound } from '../../sound';
import { evictWorldMinimaps, prefetchWorldMinimap } from './minimap';
import { weather } from '../../weather';
import { events } from '../../events';
import { lighting } from '../../lighting';
import { quests } from '../../quests';
import { effects } from '../../effects';
import { skills } from '../../skills';
import { combat } from '../../combat';
import { resetTerrainMask } from './terrainMask';
import { setShadowWorld } from '../../common/objectShadow';
import { setCycleContext } from '../../scenes/sceneLook';

/** Bumped per map change; a warp whose serial is stale abandons its result. */
let warpSerial = 0;

/**
 * The map's own setup: `SetWorldClearColor` from the entry's declared bytes
 * (SceneManager.cpp:336-365; black for every map that declares none), then
 * the entry's `create` — which binds the map's object classes into
 * `MapTileObjects` and adds whatever entities the map owns. Every per-map
 * decision lives on the entry (`src/maps/<name>/index.ts`); nothing here
 * tests the world number.
 */
async function loadWorld(world: World) {
  if (!world.terrain) return;

  const map = world.mapIndex;

  const clear = maps.clearColorFor(map);
  world.scene.clearColor = clear
    ? new Color4(clear[0] / 256, clear[1] / 256, clear[2] / 256, 1)
    : new Color4(0, 0, 0, 1);

  // The day/night cycle: the entry's scale and the authored clear colour it
  // retints (the clear colour *is* the sky). Zero scale = the cycle's seams
  // are identity and the write above is final.
  setCycleContext(
    maps.cycleScaleFor(map),
    clear ? [clear[0] / 256, clear[1] / 256, clear[2] / 256] : null
  );

  await maps.create(world);
}

function createObjects(
  world: World,
  objs: { id: number; pos: IVector3Like; rot: IVector3Like; scale: number }[]
) {
  for (const data of objs) {
    // CreateObject (ZzzObject.cpp:4433-4435) discards records outside the
    // 16×16 block grid (1600 MU units per block).
    const blockX = Math.floor(data.pos.x / 1600);
    const blockY = Math.floor(data.pos.y / 1600);
    if (blockX < 0 || blockX >= 16 || blockY < 0 || blockY >= 16) continue;
    // NaN coordinates (two Devias gate records) pass the range test above and
    // would otherwise become entities with a NaN position.
    if (!Number.isFinite(blockX) || !Number.isFinite(blockY)) continue;

    // AngleMatrix is Rz·Ry·Rx in a Z-up right-handed frame; our model-root
    // mirror means every axis is negated on the way in. Pitch/roll are
    // negated here, yaw stays MU-positive and is flipped by toRenderAngles
    // (see common/renderAngles.ts). Previously only yaw was negated, which
    // mirrored every tilted object (fences, signs, rocks, ramps).
    const angles = new Vector3(
      -toRadians(data.rot.x),
      toRadians(data.rot.z),
      -toRadians(data.rot.y)
    );

    const pos = new Vector3(
      data.pos.x / world.terrainScale,
      data.pos.z / world.terrainScale,
      data.pos.y / world.terrainScale
    );

    world.add({
      worldIndex: world.mapIndex,
      transform: {
        pos,
        rot: angles,
        scale: data.scale,
      },
      modelId: data.id,
      modelFactory: world.terrain!.MapTileObjects[data.id] || MapTileObject,
      visibility: {
        state: 'hidden',
        // Spread over the first 0.2 s so the 9 000 distance checks — and the
        // model instantiations they trigger — do not all land in one frame,
        // and stay staggered afterwards (CalculateVisibilitySystem re-arms
        // each entity relative to its own check).
        lastChecked: Math.random() * 0.2,
      },
    });
  }
}

function unloadMap(world: World, oldMap: ENUM_WORLD, newMap: ENUM_WORLD) {
  // A copy: `world.remove` mutates the live query while it is iterated,
  // which skipped every other entity of the map just left.
  const entities = [...world.with('worldIndex')];

  for (const e of entities) {
    if (e === world.playerEntity) continue;
    if (e.worldIndex === oldMap) {
      world.remove(e);
      e.onDispose?.();
      e.modelObject?.dispose();
    }
  }

  if (world.terrain) {
    world.terrain.mesh.material?.dispose(true, true);
    world.terrain.mesh.dispose(false, true);
    world.terrain = null;
  }

  // The old map's own GLBs (`Object<n>/`) have no user left; shared folders
  // (`Player/`, `Item/`, `Npc/`) are not touched. Blood Castle floors share
  // one folder, so a same-folder warp keeps everything.
  const oldAssets = assetWorldNum(oldMap);
  if (oldAssets !== assetWorldNum(newMap)) {
    // Keys are `./game-assets/Object4/Object40.glb`; the leading slash keeps
    // `Object4/` from matching `Object14/`.
    evictContainers(`/Object${oldAssets}/`);
  }
}

/**
 * A warp whose terrain cannot be loaded (a missing world folder, a corrupt
 * file, the dev server answering HTML) must leave the client on the map it
 * was on, out of the loading screen, with the failure logged — not on a
 * loading screen forever with a half-torn scene behind it.
 */
function failWarp(
  world: World,
  map: ENUM_WORLD,
  oldMap: ENUM_WORLD,
  error: unknown
) {
  console.error(`Could not load world ${map}; staying on ${oldMap}:`, error);
  world.mapIndex = oldMap;
  setShadowWorld(oldMap);
  Store.setSceneLoading(false);
  EventBus.emit('warpFailed', { map, error });
}

export async function loadMapIntoScene(
  world: World,
  map: ENUM_WORLD,
  pos?: { x: number; y: number }
) {
  const oldMap = world.mapIndex;
  world.mapIndex = map;

  // Before anything loads: a shadowless world (Icarus) must not build blob
  // clones for the objects it is about to create.
  setShadowWorld(map);

  if (oldMap !== map) {
    const serial = ++warpSerial;

    // Download and parse first, while the old map is still whole: every
    // failure that can be recovered from happens here.
    let prepared: PreparedTerrain;
    try {
      prepared = await prepareTerrain(world.scene, map);
    } catch (error) {
      if (serial === warpSerial) failWarp(world, map, oldMap, error);
      return;
    }

    // Another warp was requested while this one downloaded; it owns the
    // scene now.
    if (serial !== warpSerial) {
      disposePreparedTerrain(prepared);
      return;
    }

    unloadMap(world, oldMap, map);

    // Weather is global — the proxy computes one sky for every client, and the
    // packet is not re-sent on warp — so `Store.weather` deliberately carries
    // across the gate: the same shower really is still falling on the far side.
    // What is reset is only `RainCurrent`, so the rain fades back in over its
    // ramp instead of being at full strength in the first frame of a map the
    // player has not seen yet. Whether it may fall here at all is the rain
    // slot's business (`maps.isOutdoor` / `SNOW_MAPS`), not this line's.
    weather.reset();
    // Every light source registered against the old terrain light field;
    // the field is rebuilt from the new bake and nothing may outlive it.
    lighting.reset();
    // Every live skill effect and pooled card belongs to the old scene graph.
    effects.reset();
    // Every event window, clock and result box belongs to the map just left.
    events.reset();
    // Re-use delays belong to the world just left; buff stamps are rebased.
    skills.reset();
    // Swing latch, Nova charge, Dark Side follow-ups: all aimed at the old map.
    combat.reset();
    // The NPC quest dialogs belong to the NPC just walked away from; quest
    // states are the character's and survive.
    quests.reset();
    // The old map's ambient beds, the footstep latch, the listener pin.
    sound.reset();
    // Whatever a map entry kept for the world just left.
    maps.reset();
    // Before the new map's terrain material binds the mask: otherwise the
    // first frames of a snow map would be masked by the last map's roofs.
    resetTerrainMask();

    let built: Awaited<ReturnType<typeof getTerrainData>>;
    try {
      built = await getTerrainData(world, map, prepared);
    } catch (error) {
      // The old map is already gone; the client is at least out of the
      // loading screen and can be warped again.
      failWarp(world, map, oldMap, error);
      return;
    }

    const {
      objects,
      terrain,
      RequestTerrainHeight,
      IsWalkable,
      RequestTerrainFlag,
      SetTerrainFlags,
      GetTerrainTile,
      GetTerrainLayers,
      RequestTerrainLight,
    } = built;

    world.getTerrainHeight = RequestTerrainHeight;
    world.isWalkable = IsWalkable;
    world.getTerrainFlag = RequestTerrainFlag;
    world.setTerrainFlags = SetTerrainFlags;
    world.getTerrainTile = GetTerrainTile;
    world.getTerrainLayers = GetTerrainLayers;
    world.getTerrainLight = RequestTerrainLight;

    // `CNewUIMiniMap::LoadImages` runs on map change. The 4 MB mini_map.ozt
    // is only fetched into the HTTP cache here; the TGA decode (a long task
    // on the warp's critical path) waits for the first TAB, and the maps
    // left behind release theirs.
    evictWorldMinimaps(map);
    prefetchWorldMinimap(map);

    // `RenderTerrain` is skipped outright for the sky map (MainScene.cpp:402):
    // the mesh exists for its height field only.
    if (map === ENUM_WORLD.WD_10ICARUS) {
      terrain.isVisible = false;
    }

    world.terrain = {
      mesh: terrain,
      MapTileObjects: new Array(256).fill(MapTileObject),
      extraHeight: 0,
    };

    await loadWorld(world);

    const filteredObjects = objects;

    applyMapObjectFixups(map, filteredObjects);

    !DISABLE_OBJECTS_LOADING && createObjects(world, filteredObjects);
  }

  if (world.playerEntity) {
    world.playerEntity.worldIndex = map;
    const playerPos = world.playerEntity.transform.pos;

    if (pos) {
      playerPos.x = pos.x;
      playerPos.z = pos.y;
    } else {
      const spawn = maps.spawn(map);

      if (spawn) {
        playerPos.x = spawn.x;
        playerPos.z = spawn.y;
      }
    }

    playerPos.y = world.getTerrainHeight(playerPos.x, playerPos.z);

    const { pathfinding } = world.playerEntity;
    pathfinding.path = null;
    pathfinding.from = { x: playerPos.x, y: playerPos.z };
    pathfinding.to = { x: playerPos.x, y: playerPos.z };

    Store.syncPlayerAppearance();
  }

  EventBus.emit('warpCompleted', { map });
}
