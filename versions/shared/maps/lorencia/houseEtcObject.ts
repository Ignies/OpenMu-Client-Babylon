import { ModelObject } from '../../../../src/controllers/render/modelObject';
import { MODEL_HOUSE_ETC01 } from '../../objects/enum';

export class HouseEtcObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_HOUSE_ETC01, 'HouseEtc');
  }
}
