import { ModelObject } from '../../common/modelObject';
import { MODEL_STONE_STATUE01 } from '../../common/objects/enum';

export class StoneStatueObject extends ModelObject {
  async init() {
    // this.LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(
      MODEL_STONE_STATUE01,
      'StoneStatue'
    );
  }
}
