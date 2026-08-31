import { ModelObject } from '../../common/modelObject';

export class CurtainObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Curtain01.glb`);
  }
}
