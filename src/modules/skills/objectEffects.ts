// A magic effect on any object in view (MagicEffectStatus): the object's effect set and the look it keeps.
import { Ecs } from '@/ecs/current';
import { refreshBuffVisuals, setBuffVisual } from '@versions/shared/skills/skillVisuals';
import { Hero } from '@/modules/hero';
import { HeroSkills } from './state';

/**
 * Server compatibility: OpenMU gives seven master buffs a number of their own (SkillsInitializer.cs:84-90,
 * `EffectsOfSkills`), each a copy of its base effect on the same SubType, so one replaces the other
 * (`CopyMagicEffectValues`). The original knows them by the base effect alone (MuHelper.cpp:490-569).
 */
const OPENMU_MASTER_EFFECTS: Readonly<Record<number, number>> = {
  135: 8, // Swell Life Proficiency: Greater Fortitude
  138: 82, // Expansion of Wizardry Strengthener: Wiz Enhance
  139: 82, // ...its Mastery
  148: 5, // Critical Damage Increase Mastery
  153: 131, // Increase Block Power Up
  154: 131, // Increase Block Mastery
  155: 130, // Increase Health Strengthener
};

/** An effect packet's object and effect (MagicEffectStatus, a scope add's list): the buff bar for the hero, then the body. */
export function setObjectEffect(objectId: number, received: number, active: boolean): void {
  const effectId = OPENMU_MASTER_EFFECTS[received] ?? received;
  const maskedId = objectId & 0x7fff;
  // First: the hero object outlives a map load in the original, so the bar takes it during a warp too.
  if (maskedId === Hero.playerId) HeroSkills.setBuff(effectId, active);
  const world = Ecs.world;
  if (!world) return;
  const obj = world.getByNetId(maskedId);
  if (obj) applyObjectEffect(obj, effectId, active);
}

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
