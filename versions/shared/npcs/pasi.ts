import type { World } from '../../../src/ecs/world';
import { loadGLTF } from '../../../src/controllers/assets/modelLoader';
import { ModelObject } from '../../../src/controllers/render/modelObject';

// [NpcInfo(254, "Pasi the Mage")]
export class Pasi extends ModelObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/Wizard01.glb', world);

    this.load(bmd);
  }
}
