import { ModelObject } from '../../../../src/controllers/render/modelObject';
import { MODEL_STRAW01 } from '../../objects/enum';

export class StrawObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_STRAW01, 'Straw');
  }
}
