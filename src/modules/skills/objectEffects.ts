// A magic effect on any object in view (MagicEffectStatus): the object's effect set and the look it keeps.
import { Ecs } from '@/ecs/current';
import { setBuffVisual } from '@versions/shared/skills/skillVisuals';

/** Record an effect on an object and keep its look up (or drop it). */
export function applyObjectEffect(obj: Parameters<typeof setBuffVisual>[1], effectId: number, active: boolean) {
  const world = Ecs.world;
  if (!world) return;
  if (!obj.buffs) world.addComponent(obj, 'buffs', new Set<number>());
  if (active) obj.buffs!.add(effectId);
  else obj.buffs!.delete(effectId);
  // The persistent look of the buff (the Greater Defense knot, the Swell Life motes) - effects layer consumer.
  setBuffVisual(world.scene, obj, effectId, active);
}
