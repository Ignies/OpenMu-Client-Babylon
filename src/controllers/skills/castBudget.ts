import { GameOptions } from '@/controllers/settings';
import type { Entity } from '@/ecs/world';

/**
 * Whether a cast is drawn at all (ours, the crowd options; see readme.md). The blow, its damage
 * and its sound are the server's and the combat layer's: only the visual and its light are left out.
 */
export function castIsDrawn(caster: Entity): boolean {
  const otherPlayer = !!caster.playerAnimation && !caster.localPlayer;
  return !otherPlayer || GameOptions.otherSkillEffects;
}
