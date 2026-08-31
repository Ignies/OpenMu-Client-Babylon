import { ModelObject } from '../../common/modelObject';
import { MODEL_CANNON01 } from '../../common/objects/enum';

export class CannonObject extends ModelObject {
  async init() {
    // this.LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_CANNON01, 'Cannon');
  }
}
