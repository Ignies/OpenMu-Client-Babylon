import type { World } from '@/ecs/world';
import { loadGLTF } from '@/controllers/assets';
import { ModelObject, registerModelClass } from '@/controllers/actors';

// [NpcInfo(254, "Pasi the Mage")]
export class Pasi extends ModelObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/Wizard01.glb', world);

    this.load(bmd);
  }
}

registerModelClass(254, Pasi);
