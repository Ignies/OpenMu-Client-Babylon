import { ModelObject } from '../../../../src/controllers/render/modelObject';
import {
  MODEL_FENCE01,
} from '../../objects/enum';

export class FenceObject extends ModelObject {
  static Batchable = true;

  async init() {
    // this.LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_FENCE01, 'Fence');
  }
}
