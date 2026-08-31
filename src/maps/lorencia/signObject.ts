import { ModelObject } from '../../common/modelObject';
import { MODEL_SIGN01 } from '../../common/objects/enum';

export class SignObject extends ModelObject {
  async init() {
    // this.LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_SIGN01, 'Sign');
  }
}
