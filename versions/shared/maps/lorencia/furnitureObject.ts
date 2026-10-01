import { ModelObject } from '../../../../src/controllers/render/modelObject';
import { MODEL_FURNITURE01 } from '../../objects/enum';

export class FurnitureObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_FURNITURE01, 'Furniture');
  }
}
