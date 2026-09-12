import { ModelObject } from '../../common/modelObject';

export class StairObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Stair01.glb`);
  }
}
