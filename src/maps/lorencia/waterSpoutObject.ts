import { getMaterial } from '../../controllers/assets/modelLoader';
import { ModelObject } from '../../controllers/render/modelObject';
import { BlendState } from '../../common/objects/enum';
import type { World } from '../../ecs/world';

export class WaterSpoutObject extends ModelObject {
  static Batchable = true;

  async init(world: World) {
    // LightEnabled = true;

    await this.loadSpecificModel(`Waterspout01.glb`);

    const m = this.getMesh(3);
    if (m) {
      m.material = getMaterial(world.scene, true, 2, BlendState.ALPHA_ADD);
    }
  }
}
