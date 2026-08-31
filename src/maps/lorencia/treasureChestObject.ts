import { ModelObject } from '../../common/modelObject';

export class TreasureChestObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`TreasureChest01.glb`);
  }
}
