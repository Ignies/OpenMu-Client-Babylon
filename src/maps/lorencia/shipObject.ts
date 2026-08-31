import { ModelObject } from '../../common/modelObject';

export class ShipObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Ship01.glb`);
  }
}
