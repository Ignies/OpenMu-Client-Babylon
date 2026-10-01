import { ModelObject } from '@/controllers/render/modelObject';
import { MODEL_STEEL_WALL01 } from '../../objects/enum';

export class SteelWallObject extends ModelObject {
  static Batchable = true;

  async init() {
    //  LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_STEEL_WALL01, 'SteelWall');
  }
}
