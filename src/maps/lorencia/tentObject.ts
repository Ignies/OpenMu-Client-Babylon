import { ModelObject } from '../../common/modelObject';

export class TentObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Tent01.glb`);
  }
}
