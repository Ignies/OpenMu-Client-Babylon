import type { World } from '@/ecs/world';
import { loadGLTF } from '@/controllers/assets';
import { ModelObject, registerModelClass } from '@/controllers/actors';

// [NpcInfo(568, "Wandering Merchant Zyro")]
export class Zyro extends ModelObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/volvo.glb', world);

    this.load(bmd);
  }
}

registerModelClass(568, Zyro);
