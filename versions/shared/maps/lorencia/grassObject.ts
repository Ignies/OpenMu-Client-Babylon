import { ModelObject } from '@/controllers/render/modelObject';
import { MODEL_GRASS01 } from '../../objects/enum';

export class GrassObject extends ModelObject {
  static Batchable = true;

  CastsShadow = false;

  async init(): Promise<void> {
    await this.loadSpecificModelWithDynamicID(MODEL_GRASS01, 'Grass');
}
}
