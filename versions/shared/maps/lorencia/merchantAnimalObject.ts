import { ModelObject } from '@/controllers/render/modelObject';
import { MODEL_MERCHANT_ANIMAL01 } from '../../objects/enum';

export class MerchantAnimalObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(
      MODEL_MERCHANT_ANIMAL01,
      'MerchantAnimal'
    );
  }
}
