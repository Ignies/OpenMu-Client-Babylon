import { ModelObject } from '../../../../src/controllers/render/modelObject';

export class ShipObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Ship01.glb`);
  }
}
