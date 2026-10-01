import { ModelObject } from '../../../../src/controllers/render/modelObject';

export class StairObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Stair01.glb`);
  }
}
