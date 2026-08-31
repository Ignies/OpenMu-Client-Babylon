import { PlayerAction, ServerPlayerActionType } from '../../common/objects/enum';
import { emoteById, genderedEmoteAction } from '../../common/emotes';
import { rotationByteOf } from '../../common/turnAngle';
import { Store } from '../../store';
import type { ISystemFactory } from '../world';

/**
 * Plays the emote picked in the radial menu on the hero and tells the server
 * (ZzzInterface.cpp `SetActionClass` + `SendRequestAction`).
 *
 * The original only accepted an emote from a standing idle. We also accept it
 * while sitting / posing / healing on a rest object: the clip plays standing,
 * and when it ends the character drops back into the same rest pose and the
 * rest action is re-sent so everyone else sees it too. Walking, dying or any
 * other action change cancels that restore, exactly as it would cancel the
 * sit itself.
 */

/** PLAYER_SIT1 .. PLAYER_POSE_FEMALE1: the held rest poses (RestObjectSystem). */
function isRestAction(action: PlayerAction): boolean {
  return (
    action >= PlayerAction.PLAYER_SIT1 &&
    action <= PlayerAction.PLAYER_POSE_FEMALE1
  );
}

function restServerAction(action: PlayerAction): ServerPlayerActionType {
  if (
    action === PlayerAction.PLAYER_HEALING1 ||
    action === PlayerAction.PLAYER_HEALING_FEMALE1
  ) {
    return ServerPlayerActionType.Healing;
  }
  if (
    action === PlayerAction.PLAYER_POSE1 ||
    action === PlayerAction.PLAYER_POSE_FEMALE1
  ) {
    return ServerPlayerActionType.Pose;
  }
  return ServerPlayerActionType.Sit;
}

/** `SetActionClass` gate: the stop/idle clips, any weapon class. */
function isStandingIdle(action: PlayerAction): boolean {
  return (
    (action >= PlayerAction.PLAYER_STOP_MALE &&
      action <= PlayerAction.PLAYER_STOP_RIDE_WEAPON) ||
    action === PlayerAction.PLAYER_STOP_TWO_HAND_SWORD_TWO
  );
}

export const EmoteSystem: ISystemFactory = world => {
  let active: {
    action: PlayerAction;
    restore: PlayerAction | null;
  } | null = null;

  return {
    update: () => {
      const hero = world.playerEntity;
      if (!hero) {
        active = null;
        world.emoteRequest = null;
        return;
      }

      const anim = hero.playerAnimation;
      const model = hero.modelObject;
      const velocity = hero.movement?.velocity;
      const moving = !!velocity && (velocity.x !== 0 || velocity.y !== 0);

      if (active) {
        if (anim.action !== active.action || moving || hero.dying) {
          // Something else took over (a step, a hit, death): no restore.
          active = null;
        } else if (
          model &&
          model.CurrentAction === active.action &&
          model.ActionIterationWasFinished
        ) {
          // Runs before AnimationSystem, so setting the rest pose here keeps
          // it from re-evaluating to idle on the frame the clip ends.
          if (active.restore !== null) {
            anim.action = active.restore;
            if (!Store.isOffline) {
              Store.sendAnimationRequest(
                rotationByteOf(hero.transform.rot.y),
                restServerAction(active.restore)
              );
            }
          }
          active = null;
        }
      }

      const request = world.emoteRequest;
      if (!request) return;
      world.emoteRequest = null;

      if (hero.dying || moving || active) return;

      const current = anim.action;
      const resting = isRestAction(current);
      if (!resting && !isStandingIdle(current)) return;

      const emote = emoteById(request);
      const isFemale = hero.attributeSystem.isAboveZero('isFemale');
      const action = genderedEmoteAction(emote.action, isFemale);

      anim.action = action;
      active = { action, restore: resting ? current : null };

      if (!Store.isOffline) {
        Store.sendAnimationRequest(
          rotationByteOf(hero.transform.rot.y),
          emote.serverAction
        );
      }
    },
  };
};
