import type { World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { ModelObject } from '../modelObject';

export class Trainer extends ModelObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/Breeder.glb', world);

    this.load(bmd);
  }
}
