import type { World } from '../../../src/ecs/world';
import { loadGLTF } from '../../../src/controllers/assets/modelLoader';
import { ModelObject } from '../../../src/controllers/render/modelObject';

export class Trainer extends ModelObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/Breeder.glb', world);

    this.load(bmd);
  }
}
