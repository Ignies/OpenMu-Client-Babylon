import { ModelObject } from '../../../../src/controllers/render/modelObject';

export class BonfireObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Bonfire01.glb`);
  }
}
