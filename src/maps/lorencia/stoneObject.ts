import { ModelObject } from '../../common/modelObject';
import { MODEL_STONE01 } from '../../common/objects/enum';

export class StoneObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_STONE01, 'Stone');
  }
}
