import type { Entity, World } from '../../ecs/world';
import { ModelObject } from '../modelObject';

/**
 * An NPC the server spawns but the original never draws: the five Crywolf
 * altars are created with `Object.Visible = false` and `HiddenMesh = -2`
 * (ZzzCharacter.cpp:14266-14313) and only the event turns them on. Loading no
 * model and reporting `Ready` keeps ModelLoaderSystem from standing a
 * missing-model placeholder there.
 */
export class HiddenNpc extends ModelObject {
  override init(_world: World, _entity: Entity): Promise<void> {
    this.Ready = true;
    return Promise.resolve();
  }
}
