import type { Entity, World } from '@/ecs/world';
import { loadGLTF } from '@/controllers/assets';
import { MonsterObject } from '@/controllers/actors';
import { MonsterActionType } from '../../objects/enum';
import { monsterHiddenMesh, monsterScaleOf } from '@/controllers/actors';
import { registerModelClass } from '@/controllers/actors';

// [NpcInfo(3, "Spider")]
const NPC_TYPE = 3;

export class Spider extends MonsterObject {
  static get OverrideScale() {
    return monsterScaleOf(NPC_TYPE);
  }

  HiddenMesh = monsterHiddenMesh(NPC_TYPE);

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    super.load(await loadGLTF('Monster/Monster10.glb', world));

    this.setActionSpeed(MonsterActionType.Walk, 1.2);
  }
}

registerModelClass(3, Spider);
