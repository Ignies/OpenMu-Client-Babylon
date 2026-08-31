import type { Entity, World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';
import { MonsterActionType } from '../objects/enum';
import { MONSTER_HIDDEN_MESH, monsterScaleOf } from './monsterModelTable';

// [NpcInfo(3, "Spider")]
const NPC_TYPE = 3;

export class Spider extends MonsterObject {
  static {
    // One source of truth for Object.Scale: the Setting_Monster table in
    // monsterModelTable.ts, keyed by NPC type.
    Spider.OverrideScale = monsterScaleOf(NPC_TYPE);
  }

  HiddenMesh = MONSTER_HIDDEN_MESH[NPC_TYPE] ?? -1;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    super.load(await loadGLTF('Monster/Monster10.glb', world));

    this.setActionSpeed(MonsterActionType.Walk, 1.2);
    this.setActionSpeed(MonsterActionType.Attack1, 1.2);
  }
}
