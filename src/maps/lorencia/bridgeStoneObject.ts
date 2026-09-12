import { ModelObject } from '../../common/modelObject';

export class BridgeStoneObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`BridgeStone01.glb`);
  }
}
