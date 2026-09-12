import { ModelObject } from '../../common/modelObject';

export class BridgeObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Bridge01.glb`);
  }
}
