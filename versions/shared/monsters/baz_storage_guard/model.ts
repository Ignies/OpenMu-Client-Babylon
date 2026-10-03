import type { World } from '@/ecs/world';
import { loadGLTF } from '@/controllers/assets';
import { ModelObject, registerModelClass } from '@/controllers/actors';

export class Baz extends ModelObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/Storage01.glb', world);

    this.load(bmd);
  }
}

registerModelClass(240, Baz);
