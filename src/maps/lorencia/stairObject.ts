import { ModelObject } from '../../common/modelObject';

export class StairObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Stair01.glb`);
  }
}
