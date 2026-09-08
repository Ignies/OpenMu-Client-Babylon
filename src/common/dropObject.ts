import type { Entity, World } from '../ecs/world';
import { itemWornHeight } from './itemAngle';
import { ModelObject } from './modelObject';

/**
 * A dropped item. Everything the original does to a drop that it does not do
 * to a prop, all of it in `RenderItems` (ZzzObject.cpp:6342):
 *
 * - `ItemHeight` pulls a worn body part back down onto the ground.
 * - `HideSkin = true` keeps the head, the skin and the hair out of it.
 * - `o->AnimationFrame` is never advanced, so the model is frozen.
 */
export class DropObject extends ModelObject {
  async init(_world: World, entity: Entity): Promise<void> {
    this.BodyHeight = itemWornHeight(entity.droppedItem?.group ?? -1);
    this.HideSkin = true;
    this.FrozenPose = true;
  }
}
