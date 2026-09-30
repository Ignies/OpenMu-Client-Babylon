import { ModelObject } from '../../controllers/render/modelObject';
import { MODEL_BEER01 } from '../../common/objects/enum';

export class BeerObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_BEER01, 'Beer');
  }
}
