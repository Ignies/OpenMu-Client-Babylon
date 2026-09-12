import { ModelObject } from '../../common/modelObject';

export class CurtainObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Curtain01.glb`);
  }
}
