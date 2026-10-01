import { World } from '../../../src/ecs/world';
import { loadGLTF } from '../../../src/controllers/assets/modelLoader';
import { ModelObject } from '../../../src/controllers/render/modelObject';

export class Baz extends ModelObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/Storage01.glb', world);

    this.load(bmd);
  }
}
