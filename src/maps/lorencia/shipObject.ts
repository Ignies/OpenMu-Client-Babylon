import { ModelObject } from '../../common/modelObject';

export class ShipObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Ship01.glb`);
  }
}
