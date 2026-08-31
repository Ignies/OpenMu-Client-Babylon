import { ModelObject } from '../../common/modelObject';
import { MODEL_FURNITURE01 } from '../../common/objects/enum';

export class FurnitureObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_FURNITURE01, 'Furniture');
  }
}
