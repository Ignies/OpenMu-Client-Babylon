import { ModelObject } from '../../common/modelObject';
import { MODEL_STEEL_WALL01 } from '../../common/objects/enum';

export class SteelWallObject extends ModelObject {
  static Batchable = true;

  async init() {
    //  LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_STEEL_WALL01, 'SteelWall');
  }
}
