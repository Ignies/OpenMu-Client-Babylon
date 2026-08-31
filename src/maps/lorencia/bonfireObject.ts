import { ModelObject } from '../../common/modelObject';

export class BonfireObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Bonfire01.glb`);
  }
}
