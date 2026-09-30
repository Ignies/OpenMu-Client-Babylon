import { ModelObject } from '../../controllers/render/modelObject';

export class DungeonGateObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`DoungeonGate01.glb`);
  }
}
