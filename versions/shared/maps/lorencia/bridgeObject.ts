import { ModelObject } from '../../../../src/controllers/render/modelObject';

export class BridgeObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Bridge01.glb`);
  }
}
