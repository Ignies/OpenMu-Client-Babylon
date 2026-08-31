import { ModelObject } from '../../common/modelObject';
import { BlendState, MODEL_HOUSE01 } from '../../common/objects/enum';
import { getMaterial } from '../../common/modelLoader';
import { World } from '../../ecs/world';

export class HouseObject extends ModelObject {
  async init(world: World) {
    // LightEnabled = true;
    await this.loadSpecificModelWithDynamicID(MODEL_HOUSE01, 'House');

    const idx = this.Type - MODEL_HOUSE01 + 1;

    if (idx === 3) {
      const m = this.getMesh(4);
      if (m) {
        m.material = getMaterial(world.scene, true, 2, BlendState.ALPHA_ADD);
      }
    } else if (idx === 4) {
      const m = this.getMesh(8);
      if (m) {
        m.material = getMaterial(world.scene, true, 2, BlendState.ALPHA_ADD);
      }
    }
  }
}
