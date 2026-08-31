import { ModelObject } from '../../common/modelObject';
import { MODEL_MU_WALL01 } from '../../common/objects/enum';

export class MuWallObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_MU_WALL01, 'StoneMuWall');
  }
}
