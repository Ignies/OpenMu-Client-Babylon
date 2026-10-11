import { ModelObject } from '@/controllers/render/modelObject';
import { MODEL_CANNON01 } from '../../objects/enum';

export class CannonObject extends ModelObject {
  static Batchable = true;

  async init() {
    // this.LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_CANNON01, 'Cannon');
  }
}
