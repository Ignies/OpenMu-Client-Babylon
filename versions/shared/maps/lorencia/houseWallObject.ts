import { ModelObject } from '@/controllers/render/modelObject';
import { MODEL_HOUSE_WALL01 } from '../../objects/enum';

/** `(float)(rand() % 4 + 4) * 0.1f`: 0.4 to 0.7 in tenths, rolled afresh every frame. */
const flicker = () => (Math.floor(Math.random() * 4) + 4) * 0.1;

export class HouseWallObject extends ModelObject {
  async init() {
    await this.loadSpecificModelWithDynamicID(MODEL_HOUSE_WALL01, 'HouseWall');

    // House Wall 02's window: `MoveObject` rolls its BlendMesh 4's light every frame (ZzzObject.cpp:3752-3754, :4563-4564).
    if (this.Type === MODEL_HOUSE_WALL01 + 1) this.BlendMeshLightAt = flicker;
  }
}
