import { ModelObject } from '../../common/modelObject';

export class TreasureChestObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`TreasureChest01.glb`);
  }
}
