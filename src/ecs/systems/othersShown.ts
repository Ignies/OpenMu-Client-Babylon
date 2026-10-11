import { GameOptions } from '@/controllers/settings';
import type { Entity } from '../world';

/**
 * The crowd options (ours, Options > Video > World): what of other players is drawn. The hero
 * and the monsters are never thinned. See ecs/readme.md.
 */

/** Another player's character, not the hero. */
export function isOtherPlayer(e: Entity): boolean {
  return !!e.playerAnimation && !e.localPlayer;
}

/** The sparkle, aura and light of this character's gear (`itemGlowSystem`). */
export function gearEffectsShown(e: Entity): boolean {
  return GameOptions.otherGearEffects || !isOtherPlayer(e);
}

/** This owner's pet of `kind` (`petSystem`); a ridden mount always stays. */
export function petShown(owner: Entity, kind: string): boolean {
  return kind === 'mount' || GameOptions.otherPets || !isOtherPlayer(owner);
}
