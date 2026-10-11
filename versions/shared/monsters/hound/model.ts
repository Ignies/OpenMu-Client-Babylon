import type { Entity, World } from '@/ecs/world';
import { loadGLTF } from '@/controllers/assets';
import { MonsterObject } from '@/controllers/actors';
import { monsterHiddenMesh, monsterScaleOf } from '@/controllers/actors';
import { registerModelClass } from '@/controllers/actors';

// [NpcInfo(1, "Hound")]
const NPC_TYPE = 1;

export class Hound extends MonsterObject {
  static get OverrideScale() {
    return monsterScaleOf(NPC_TYPE);
  }

  // `c->Object.HiddenMesh = 0` - the Hell Hound variant's kit (:13856).
  HiddenMesh = monsterHiddenMesh(NPC_TYPE);

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    super.load(await loadGLTF('Monster/Monster02.glb', world));
  }
}

registerModelClass(1, Hound);
