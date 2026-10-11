import { ModelObject } from '@/controllers/render/modelObject';
import { MODEL_WELL01 } from '../../objects/enum';

export class WellObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_WELL01, 'Well');
  }
}
