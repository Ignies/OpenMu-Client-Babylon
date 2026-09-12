import { ModelObject } from '../../common/modelObject';

export class SteelStatueObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`SteelStatue01.glb`);
  }
}
