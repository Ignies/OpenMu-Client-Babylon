import { ModelObject } from '../../common/modelObject';

export class TreasureDrumObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`TreasureDrum01.glb`);
  }
}
