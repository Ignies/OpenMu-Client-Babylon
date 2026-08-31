import type { Entity, World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';
import { MonsterActionType } from '../objects/enum';
import { MONSTER_HIDDEN_MESH, monsterScaleOf } from './monsterModelTable';

// [NpcInfo(2, "Budge Dragon")]
const NPC_TYPE = 2;

export class BudgeDragon extends MonsterObject {
  static {
    // One source of truth for Object.Scale: the Setting_Monster table in
    // monsterModelTable.ts, keyed by NPC type.
    BudgeDragon.OverrideScale = monsterScaleOf(NPC_TYPE);
  }

  HiddenMesh = MONSTER_HIDDEN_MESH[NPC_TYPE] ?? -1;

  /** `o->Position[2] += -|sin(Timer)| * 70 + 70` while walking (:6274). */
  BobsWhileMoving = true;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.load(await loadGLTF('Monster/Monster03.glb', world));

    this.setActionSpeed(MonsterActionType.Walk, 0.7);
  }
}
