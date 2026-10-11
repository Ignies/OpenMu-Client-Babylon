import { ModelObject } from '@/controllers/render/modelObject';
import { MODEL_HOUSE01 } from '../../objects/enum';

/** Houses 01-05: their blend meshes and `MoveObject`'s writes to them are the map's tables (`spec.ts`). */
export class HouseObject extends ModelObject {
  static Batchable = true;

  async init() {
    await this.loadSpecificModelWithDynamicID(MODEL_HOUSE01, 'House');
  }
}
