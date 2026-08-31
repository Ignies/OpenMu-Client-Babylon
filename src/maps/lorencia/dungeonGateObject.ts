import { ModelObject } from '../../common/modelObject';

export class DungeonGateObject extends ModelObject {
  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`DoungeonGate01.glb`);
  }
}
