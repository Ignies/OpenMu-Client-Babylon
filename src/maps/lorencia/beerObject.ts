import { ModelObject } from '../../common/modelObject';
import { MODEL_BEER01 } from '../../common/objects/enum';

export class BeerObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_BEER01, 'Beer');
  }
}
