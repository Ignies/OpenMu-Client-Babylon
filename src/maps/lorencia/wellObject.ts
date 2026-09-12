import { ModelObject } from '../../common/modelObject';
import { MODEL_WELL01 } from '../../common/objects/enum';

export class WellObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_WELL01, 'Well');
  }
}
