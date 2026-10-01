import { getMaterial } from '../../../../src/controllers/assets/modelLoader';
import { ModelObject } from '../../../../src/controllers/render/modelObject';
import { BlendState } from '../../objects/enum';
import type { World } from '../../../../src/ecs/world';

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
