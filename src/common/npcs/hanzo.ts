import type { World } from '../../ecs/world';
import { loadGLTF } from '../../controllers/assets/modelLoader';
import { ModelObject } from '../../controllers/render/modelObject';

// [NpcInfo(251, "Hanzo The Blacksmith")]
export class Hanzo extends ModelObject {
  async init(world: World) {
    this.load(await loadGLTF('NPC/Smith01.glb', world));
  }
}
