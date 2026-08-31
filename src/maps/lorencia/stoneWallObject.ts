import { ModelObject } from '../../common/modelObject';
import { MODEL_STONE_WALL01 } from '../../common/objects/enum';

export class StoneWallObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_STONE_WALL01, 'StoneWall');
  }
}
