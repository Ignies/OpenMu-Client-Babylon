import type { World } from '@/ecs/world';
import { loadGLTF } from '@/controllers/assets';
import { ModelObject, registerModelClass } from '@/controllers/actors';

export class Trainer extends ModelObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/Breeder.glb', world);

    this.load(bmd);
  }
}

registerModelClass(226, Trainer);
