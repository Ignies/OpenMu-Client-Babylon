import { ModelObject } from '../../common/modelObject';
import {
  MODEL_FENCE01,
} from '../../common/objects/enum';

export class FenceObject extends ModelObject {
  async init() {
    // this.LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_FENCE01, 'Fence');
  }
}
