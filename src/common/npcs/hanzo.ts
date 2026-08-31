import type { World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { ModelObject } from '../modelObject';

// [NpcInfo(251, "Hanzo The Blacksmith")]
export class Hanzo extends ModelObject {
  async init(world: World) {
    this.load(await loadGLTF('NPC/Smith01.glb', world));
  }
}
