import type { Entity, World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';
import { MonsterActionType } from '../objects/enum';
import { monsterModelFile, monsterScaleOf } from './monsterModelTable';

// [NpcInfo(459, "Selupan")] - MODEL_SELUPAN at Scale 2.0
// (GM_Raklion.cpp:142-156). His attack voices (ZzzOpenData.cpp:3767-3776)
// are in sound/monsters.ts; the ice-storm / web attack staging
// (GM_Raklion.cpp:498-560) belongs to the Raklion event work (plan 3.5).
const NPC_TYPE = 459;

/** MONSTER_MODEL_SELUPAN. */
const MODEL_TYPE = 150;

export class Selupan extends MonsterObject {
  static {
    Selupan.OverrideScale = monsterScaleOf(NPC_TYPE);
  }

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.load(await loadGLTF(monsterModelFile(MODEL_TYPE), world));

    // ZzzOpenData.cpp:2777-2786
    this.setActionSpeed(MonsterActionType.Walk, 0.2);
    this.setActionSpeed(MonsterActionType.Attack1, 0.25);
    this.setActionSpeed(MonsterActionType.Attack2, 0.25);
    this.setActionSpeed(MonsterActionType.Shock, 0.35);
    this.setActionSpeed(MonsterActionType.Die, 0.18);
    this.setActionSpeed(MonsterActionType.Appear, 0.25);
    this.setActionSpeed(MonsterActionType.Attack3, 0.25);
    this.setActionSpeed(MonsterActionType.Attack4, 0.25);
  }
}
