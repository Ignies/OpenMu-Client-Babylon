import { ModelObject } from '../../common/modelObject';
import { MODEL_STONE_WALL01 } from '../../common/objects/enum';

export class StoneWallObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_STONE_WALL01, 'StoneWall');
  }
}
