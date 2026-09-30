import { ModelObject } from '../../controllers/render/modelObject';
import { MODEL_STRAW01 } from '../../common/objects/enum';

export class StrawObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_STRAW01, 'Straw');
  }
}
