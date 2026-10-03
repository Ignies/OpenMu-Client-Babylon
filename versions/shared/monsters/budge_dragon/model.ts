import type { Entity, World } from '@/ecs/world';
import { loadGLTF } from '@/controllers/assets';
import { MonsterObject } from '@/controllers/actors';
import { MonsterActionType } from '../../objects/enum';
import { monsterHiddenMesh, monsterScaleOf } from '@/controllers/actors';
import { registerModelClass } from '@/controllers/actors';

// [NpcInfo(2, "Budge Dragon")]
const NPC_TYPE = 2;

export class BudgeDragon extends MonsterObject {
  static get OverrideScale() {
    return monsterScaleOf(NPC_TYPE);
  }

  HiddenMesh = monsterHiddenMesh(NPC_TYPE);

  /** `o->Position[2] += -|sin(Timer)| * 70 + 70` while walking (:6274). */
  BobsWhileMoving = true;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.load(await loadGLTF('Monster/Monster03.glb', world));

    this.setActionSpeed(MonsterActionType.Walk, 0.7);
  }
}

registerModelClass(2, BudgeDragon);
