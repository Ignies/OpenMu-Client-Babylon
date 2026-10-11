import { GameOptions } from '@/controllers/settings';
import type { Entity } from '../world';
import { isNpcOrTrapType } from './attackSystem';

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

/** An NPC: what `isNpcOrTrapType` names, less the traps (100-110), which have no clips worth holding. */
function isNpc(e: Entity): boolean {
  const type = e.npcType;
  return type !== undefined && (type < 100 || type > 110) && isNpcOrTrapType(type);
}

/** This model's looping clips held still (`animationHoldSystem`); swings and deaths still play. */
export function animationsHeld(e: Entity): boolean {
  return (!GameOptions.otherPlayerAnimations && isOtherPlayer(e)) || (!GameOptions.npcAnimations && isNpc(e));
}
