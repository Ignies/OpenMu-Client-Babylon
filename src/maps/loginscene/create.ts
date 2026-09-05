import { ModelObject } from '../../common/modelObject';
import type { World } from '../../ecs/world';
import { LOGIN_SCENE_ABSENT_MODELS } from '../empireguardian/spec';

/**
 * The login and character-select backdrops. The scene systems own the camera
 * and the effects; the only setup here is the object types whose model no
 * client ships, bound to a class that never asks for it.
 */

/** A placed type with no model file: nothing to draw, nothing to fetch. */
class AbsentModelObject extends ModelObject {
  async init() {
    this.CastsShadow = false;
    this.Visible = false;
    this.Ready = true;
  }
}

export async function createLoginScene(world: World) {
  const terrain = world.terrain;
  if (!terrain) return;

  for (const type of LOGIN_SCENE_ABSENT_MODELS) {
    terrain.MapTileObjects[type] = AbsentModelObject;
  }
}
