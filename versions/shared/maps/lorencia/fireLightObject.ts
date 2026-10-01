import { ModelObject } from '../../../../src/controllers/render/modelObject';
import { MODEL_FIRE_LIGHT01 } from '../../objects/enum';

export class FireLightObject extends ModelObject {
  CastsShadow = false;

  async init() {
    await this.loadSpecificModelWithDynamicID(MODEL_FIRE_LIGHT01, 'FireLight');
  }
}
