import { ModelObject } from '../../common/modelObject';

export class TentObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Tent01.glb`);
  }
}
