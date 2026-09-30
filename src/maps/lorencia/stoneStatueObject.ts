import { ModelObject } from '../../controllers/render/modelObject';
import { MODEL_STONE_STATUE01 } from '../../common/objects/enum';

export class StoneStatueObject extends ModelObject {
  static Batchable = true;

  async init() {
    // this.LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(
      MODEL_STONE_STATUE01,
      'StoneStatue'
    );
  }
}
