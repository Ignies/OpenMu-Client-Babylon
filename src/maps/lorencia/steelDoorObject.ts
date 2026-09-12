import { ModelObject } from '../../common/modelObject';

export class SteelDoorObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`SteelDoor01.glb`);
  }
}
