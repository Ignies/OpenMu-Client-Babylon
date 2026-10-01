import { ModelObject } from '../../../../src/controllers/render/modelObject';
import { MODEL_STONE01 } from '../../objects/enum';

export class StoneObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_STONE01, 'Stone');
  }
}
