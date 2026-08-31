import { ModelObject } from '../../common/modelObject';
import { MODEL_CARRIAGE01 } from '../../common/objects/enum';

export class CarriageObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_CARRIAGE01, 'Carriage');
  }
}
