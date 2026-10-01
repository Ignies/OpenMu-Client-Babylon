import { ModelObject } from '../../../../src/controllers/render/modelObject';
import { MODEL_CARRIAGE01 } from '../../objects/enum';

export class CarriageObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_CARRIAGE01, 'Carriage');
  }
}
