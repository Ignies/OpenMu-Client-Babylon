import { ModelObject } from '../../common/modelObject';
import { MODEL_TREE01 } from '../../common/objects/enum';

export class TreeObject extends ModelObject {
  async init() {
    //  LightEnabled = true;

    await this.loadSpecificModelWithDynamicID(MODEL_TREE01, 'Tree');

    // float terrainHeight = World.Terrain.RequestTerrainHeight(Position.X, Position.Y);

    // if (Position.Z < terrainHeight)
    // {
    //     return;
    // }

    // if (Type == 9)
    // {
    //     float baseHeight = terrainHeight + 10f;
    //     Position = new Vector3(Position.X, Position.Y, baseHeight);
    // }
  }
}
