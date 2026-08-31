import { ModelObject } from '../../common/modelObject';

export class SteelStatueObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`SteelStatue01.glb`);
  }
}
