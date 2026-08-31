import { ModelObject } from '../../common/modelObject';

export class BridgeObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Bridge01.glb`);
  }
}
