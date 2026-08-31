import type { World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { ModelObject } from '../modelObject';

// [NpcInfo(375, "Chaos Card Master")]
export class ChaosCardMaster extends ModelObject {
  async init(world: World) {
    // TODO
    this.load(await loadGLTF('NPC/Smith01.glb', world));
  }
}
