import { ModelObject } from '@/controllers/render/modelObject';

export class HangingObject extends ModelObject {
  static Batchable = true;

  async init() {
    // LightEnabled = true;

    await this.loadSpecificModel(`Hanging01.glb`);
  }
}
