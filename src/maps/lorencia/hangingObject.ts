import { ModelObject } from '../../common/modelObject';

export class HangingObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Hanging01.glb`);
  }
}
