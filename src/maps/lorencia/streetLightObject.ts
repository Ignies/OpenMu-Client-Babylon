import { ModelObject } from '../../common/modelObject';

export class StreetLightObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`StreetLight01.glb`);
  }
}
