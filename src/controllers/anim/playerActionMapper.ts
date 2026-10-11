import { PlayerAction } from '@versions/shared/objects/enum';
import { animations } from './animation';

// Player clip classes, each read off the clip's animation file (versions/shared/animations).

/** A basic or skill swing: PLAYER_ATTACK_FIST .. PLAYER_ATTACK_END (`attack`). */
export function isPlayerAttackAction(action: PlayerAction): boolean {
  return !!animations.get(action)?.attack;
}

/**
 * Actions that play once and then hand control back to the idle/walk logic (`skill`).
 *
 * The bounds are the original's, read off the test it uses to decide whether the hero is still busy
 * with a clip (ZzzInterface.cpp:7570-7580): `PLAYER_ATTACK_FIST … PLAYER_RIDE_SKILL`,
 * `PLAYER_SKILL_SLEEP … PLAYER_SKILL_LIGHTNING_SHOCK`, `PLAYER_RECOVER_SKILL` and
 * `PLAYER_SKILL_THRUST … PLAYER_SKILL_HP_UP_OURFORCES`, less the stand / walk / run clips it
 * re-admits by name. A cast clip without it would loop for ever instead of returning to idle.
 */
export function isPlayerSkillAction(action: PlayerAction): boolean {
  return !!animations.get(action)?.skill;
}

/** `SetActionClass` gate: the stop/idle clips, any weapon class (`idle`). */
export function isStandingIdle(action: PlayerAction): boolean {
  return !!animations.get(action)?.idle;
}

/** Plays once, then idle takes over: attack, skill and emote clips, and those marked `oneShot`. */
export function isOneShotPlayerAction(action: PlayerAction): boolean {
  const d = animations.get(action);
  return !!d && !!(d.attack || d.skill || d.emote || d.oneShot);
}

/** A rest pose (sit, heal, pose) held until the character moves (`rest`). */
export function isRestAction(action: PlayerAction): boolean {
  return !!animations.get(action)?.rest;
}

/** Server action (0x18) -> clip, from each animation file's `serverActions`. */
export const ServerToClientActionMap = animations.serverToClient;

/** The clip a female character plays for `action` (`SetActionClass`): the file's `female`. */
export function resolveGenderedAction(action: PlayerAction, isFemale: boolean): PlayerAction {
  if (!isFemale) return action;
  const female = animations.get(action)?.female;
  return female === undefined ? action : PlayerAction[female];
}
