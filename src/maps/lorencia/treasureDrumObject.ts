import { ModelObject } from '../../controllers/render/modelObject';

export class TreasureDrumObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`TreasureDrum01.glb`);
  }
}
