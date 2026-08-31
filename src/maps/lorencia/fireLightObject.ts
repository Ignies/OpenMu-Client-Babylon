import { ModelObject } from '../../common/modelObject';
import { MODEL_FIRE_LIGHT01 } from '../../common/objects/enum';

export class FireLightObject extends ModelObject {
  CastsShadow = false;

  async init() {
    await this.loadSpecificModelWithDynamicID(MODEL_FIRE_LIGHT01, 'FireLight');
  }
}
