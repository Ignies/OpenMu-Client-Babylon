import { World } from '@/ecs/world';
import { loadGLTF } from '@/controllers/assets/modelLoader';
import { ModelObject } from '@/controllers/render/modelObject';

export class Baz extends ModelObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/Storage01.glb', world);

    this.load(bmd);
  }
}
