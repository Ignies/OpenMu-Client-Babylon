import { ModelObject } from '../../common/modelObject';

export class BridgeStoneObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`BridgeStone01.glb`);
  }
}
