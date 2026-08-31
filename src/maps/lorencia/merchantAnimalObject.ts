import { ModelObject } from '../../common/modelObject';
import { MODEL_MERCHANT_ANIMAL01 } from '../../common/objects/enum';

export class MerchantAnimalObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(
      MODEL_MERCHANT_ANIMAL01,
      'MerchantAnimal'
    );
  }
}
