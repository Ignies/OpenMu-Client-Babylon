import { ElfSoldier } from '../../common/npcs/elfSoldier';
import {
  MODEL_HOUSE_WALL05,
  MODEL_HOUSE_WALL06,
  MonsterActionType,
} from '../../common/objects/enum';
import { World } from '../../ecs/world';
import { mapMusic, sound } from '../../sound';
import { setAreaMood } from '../../scenes/sceneLook';
import { createAttributeSystem } from '../../libs/attributeSystem';
import { Vector3 } from '../../libs/babylon/exports';
import { Store } from '../../store';
import { BeerObject } from './beerObject';
import { BonfireObject } from './bonfireObject';
import { BridgeObject } from './bridgeObject';
import { BridgeStoneObject } from './bridgeStoneObject';
import { CandleObject } from './candleObject';
import { CannonObject } from './cannonObject';
import { CarriageObject } from './carriageObject';
import { CurtainObject } from './curtainObject';
import { DungeonGateObject } from './dungeonGateObject';
import { FenceObject } from './fenceObject';
import { FireLightObject } from './fireLightObject';
import { FurnitureObject } from './furnitureObject';
import { GrassObject } from './grassObject';
import { HangingObject } from './hangingObject';
import { HouseEtcObject } from './houseEtcObject';
import { HouseObject } from './houseObject';
import { HouseWallObject } from './houseWallObject';
import { MerchantAnimalObject } from './merchantAnimalObject';
import { MuWallObject } from './muWallObject';
import { PoseBoxObject } from './poseBoxObject';
import { ShipObject } from './shipObject';
import { SignObject } from './signObject';
import { StairObject } from './stairObject';
import { SteelDoorObject } from './steelDoorObject';
import { SteelStatueObject } from './steelStatueObject';
import { SteelWallObject } from './steelWallObject';
import { StoneObject } from './stoneObject';
import { StoneStatueObject } from './stoneStatueObject';
import { StoneWallObject } from './stoneWallObject';
import { StrawObject } from './strawObject';
import { StreetLightObject } from './streetLightObject';
import { TentObject } from './tentObject';
import { TombObject } from './tombObject';
import { TreasureChestObject } from './treasureChestObject';
import { TreasureDrumObject } from './treasureDrumObject';
import { TreeObject } from './treeObject';
import { WaterSpoutObject } from './waterSpoutObject';
import { WellObject } from './wellObject';

const DISABLE = false;

/**
 * The pub floor (x 120-129, y 120-136): pub music, the tavern mood and the
 * two house-wall types lifted out of the way while the hero is inside.
 * `AmbientParticleSystem`'s `LORENCIA_TAVERN` room matches this footprint.
 */
function createTavern(world: World) {
  const map = world.mapIndex;
  const walls = [MODEL_HOUSE_WALL05, MODEL_HOUSE_WALL06];
  const liftWalls = (offset: { x: number; y: number; z: number } | undefined) => {
    const query = world.with('transform', 'modelId', 'worldIndex');
    for (const e of query) {
      if (e.worldIndex !== map) continue;
      if (walls.includes(e.modelId)) e.transform.posOffset = offset;
    }
  };

  world.add({
    worldIndex: map,
    interactiveArea: {
      min: { x: 120, y: 120 },
      max: { x: 129, y: 136 },
      onEnter: () => {
        sound.playMusic('Music/Pub');
        setAreaMood('lorenciaTavern');
        liftWalls({ x: 0, y: 100, z: 0 });
      },
      onLeave: () => {
        sound.playMusic(mapMusic(map) ?? 'Music/main_theme');
        setAreaMood(null);
        liftWalls(undefined);
      },
    },
    onDispose: () => {
      sound.stop('Music/Pub');
      setAreaMood(null);
    },
  });
}

export async function createLorencia(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  createTavern(world);

  if (DISABLE) return;

  for (let i = 0; i < 13; i++) terrain.MapTileObjects[i] = TreeObject;

  for (let i = 0; i < 8; i++) terrain.MapTileObjects[20 + i] = GrassObject;

  for (let i = 0; i < 5; i++) terrain.MapTileObjects[30 + i] = StoneObject;

  for (var i = 0; i < 3; i++)
    terrain.MapTileObjects[40 + i] = StoneStatueObject;

  terrain.MapTileObjects[43] = SteelStatueObject;

  for (var i = 0; i < 3; i++) terrain.MapTileObjects[44 + i] = TombObject;

  for (var i = 0; i < 2; i++) terrain.MapTileObjects[50 + i] = FireLightObject;

  terrain.MapTileObjects[52] = BonfireObject;
  terrain.MapTileObjects[55] = DungeonGateObject;

  for (var i = 0; i < 2; i++)
    terrain.MapTileObjects[56 + i] = MerchantAnimalObject;

  terrain.MapTileObjects[58] = TreasureDrumObject;
  terrain.MapTileObjects[59] = TreasureChestObject;
  terrain.MapTileObjects[60] = ShipObject;

  for (var i = 0; i < 3; i++) terrain.MapTileObjects[65 + i] = SteelWallObject;

  terrain.MapTileObjects[68] = SteelDoorObject;

  for (var i = 0; i < 6; i++) terrain.MapTileObjects[69 + i] = StoneWallObject;

  for (var i = 0; i < 4; i++) terrain.MapTileObjects[75 + i] = MuWallObject;

  terrain.MapTileObjects[80] = BridgeObject;

  for (var i = 0; i < 4; i++) terrain.MapTileObjects[81 + i] = FenceObject;

  terrain.MapTileObjects[85] = BridgeStoneObject;

  terrain.MapTileObjects[90] = StreetLightObject;

  for (var i = 0; i < 3; i++) terrain.MapTileObjects[91 + i] = CannonObject;

  terrain.MapTileObjects[95] = CurtainObject;

  for (var i = 0; i < 2; i++) terrain.MapTileObjects[96 + i] = SignObject;

  for (var i = 0; i < 4; i++) terrain.MapTileObjects[98 + i] = CarriageObject;

  for (var i = 0; i < 2; i++) terrain.MapTileObjects[102 + i] = StrawObject;

  terrain.MapTileObjects[105] = WaterSpoutObject;

  for (var i = 0; i < 4; i++) terrain.MapTileObjects[106 + i] = WellObject;

  terrain.MapTileObjects[110] = HangingObject;
  terrain.MapTileObjects[111] = StairObject;

  for (var i = 0; i < 5; i++) terrain.MapTileObjects[115 + i] = HouseObject;

  terrain.MapTileObjects[120] = TentObject;

  for (var i = 0; i < 6; i++) terrain.MapTileObjects[121 + i] = HouseWallObject;

  for (var i = 0; i < 3; i++) terrain.MapTileObjects[127 + i] = HouseEtcObject;

terrain.MapTileObjects[133] = PoseBoxObject;

  for (var i = 0; i < 7; i++) terrain.MapTileObjects[140 + i] = FurnitureObject;

  terrain.MapTileObjects[150] = CandleObject;

  for (var i = 0; i < 3; i++) terrain.MapTileObjects[151 + i] = BeerObject;

  if (Store.isOffline) {
    const modelFactory = ElfSoldier;

    const npcEntity = world.add({
      worldIndex: world.mapIndex,
      // Elf Soldier (monsters.json 257): a KIND_NPC, so the cursor and the
      // hover name balloon treat it as one.
      npcType: 257,
      transform: {
        pos: new Vector3(133, world.getTerrainHeight(133, 131), 131),
        rot: new Vector3(0, 0, 0),
        scale: modelFactory.OverrideScale >= 0 ? modelFactory.OverrideScale : 1,
        posOffset: new Vector3(0.5, 0, 0.5),
      },
      modelFactory,
      pathfinding: {
        from: { x: 0, y: 0 },
        to: { x: 0, y: 0 },
        path: [],
        calculated: true,
      },
      playerMoveTo: {
        point: { x: 0, y: 0 },
        handled: true as boolean,
      },
      movement: {
        velocity: { x: 0, y: 0 },
      },
      monsterAnimation: {
        action: MonsterActionType.Stop1,
      },
      attributeSystem: createAttributeSystem(),
      visibility: {
        lastChecked: 0,
        state: 'hidden',
      },
      screenPosition: {
        worldOffsetZ: 2.5,
        x: 0,
        y: 0,
      },
      objectNameInWorld: 'NPC',
      interactable: true,
    });

    npcEntity.attributeSystem.setValue('isFemale', 0);
    npcEntity.attributeSystem.setValue('isFlying', 0);
  }
}
