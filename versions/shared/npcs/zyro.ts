import type { World } from '../../../src/ecs/world';
import { loadGLTF } from '../../../src/controllers/assets/modelLoader';
import { ModelObject } from '../../../src/controllers/render/modelObject';

// [NpcInfo(568, "Wandering Merchant Zyro")]
export class Zyro extends ModelObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/volvo.glb', world);

    this.load(bmd);
  }
}
