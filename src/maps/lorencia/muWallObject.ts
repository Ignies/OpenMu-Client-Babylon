import { ModelObject } from '../../controllers/render/modelObject';
import { MODEL_MU_WALL01 } from '../../common/objects/enum';

export class MuWallObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_MU_WALL01, 'StoneMuWall');
  }
}
