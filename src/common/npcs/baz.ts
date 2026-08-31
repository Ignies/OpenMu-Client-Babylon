import { World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { ModelObject } from '../modelObject';

export class Baz extends ModelObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/Storage01.glb', world);

    this.load(bmd);
  }
}
