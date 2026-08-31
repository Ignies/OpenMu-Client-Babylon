import { ModelObject } from '../../common/modelObject';
import { MODEL_TOMB01 } from '../../common/objects/enum';

export class TombObject extends ModelObject {
  async init() {
    // this.LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_TOMB01, 'Tomb');
  }
}
