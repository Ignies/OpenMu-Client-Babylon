import type { World } from '@/ecs/world';
import { loadGLTF } from '@/controllers/assets/modelLoader';
import { ModelObject } from '@/controllers/render/modelObject';

// [NpcInfo(568, "Wandering Merchant Zyro")]
export class Zyro extends ModelObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/volvo.glb', world);

    this.load(bmd);
  }
}
