// A magic effect on any object in view (MagicEffectStatus): the object's effect set and the look it keeps.
import { Ecs } from '@/ecs/current';
import { refreshBuffVisuals, setBuffVisual } from '@versions/shared/skills/skillVisuals';

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

/**
 * The looks of every effect still held in view, drawn again: a map change's `effects.reset` ends them,
 * while the hero and whoever the new map put in view during the load keep their effects.
 */
export function redrawBuffLooks(): void {
  const world = Ecs.world;
  if (!world) return;
  for (const e of world.netObjsQuery.entities) refreshBuffVisuals(world.scene, e);
}
