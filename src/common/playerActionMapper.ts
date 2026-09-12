import { PlayerAction, ServerPlayerActionType } from './objects/enum';
import { genderedEmoteAction, isPlayerEmoteAction } from './emotes';

export function isPlayerAttackAction(action: PlayerAction): boolean {
  return (
    action >= PlayerAction.PLAYER_ATTACK_FIST &&
    action < PlayerAction.PLAYER_ATTACK_END
  );
}

/**
 * Actions that play once and then hand control back to the idle/walk logic.
 *
 * The bounds are the original's, read off the test it uses to decide whether
 * the hero is still busy with a clip (ZzzInterface.cpp:7570-7580): the block
 * runs `PLAYER_ATTACK_FIST … PLAYER_RIDE_SKILL`, then
 * `PLAYER_SKILL_SLEEP … PLAYER_SKILL_LIGHTNING_SHOCK`, `PLAYER_RECOVER_SKILL`
 * and `PLAYER_SKILL_THRUST … PLAYER_SKILL_HP_UP_OURFORCES`, and re-admits the
 * stand / walk / run clips that happen to sit inside the first range. Every
 * skill clip of `combat/recipes.ts` falls in one of these — a cast clip
 * outside them would loop for ever instead of returning to idle, which is
 * what the old `PLAYER_SKILL_HAND1 … PLAYER_SKILL_TELEPORT` bound did to
 * every clip past Teleport.
 */
export function isPlayerSkillAction(action: PlayerAction): boolean {
  // The stand / walk / run clips the original re-admits by name.
  if (
    (action >= PlayerAction.PLAYER_DARKLORD_STAND &&
      action <= PlayerAction.PLAYER_RUN_RIDE_HORSE) ||
    (action >= PlayerAction.PLAYER_FENRIR_RUN &&
      action <= PlayerAction.PLAYER_FENRIR_WALK_ONE_LEFT) ||
    (action >= PlayerAction.PLAYER_STOP_TWO_HAND_SWORD_TWO &&
      action <= PlayerAction.PLAYER_RUN_TWO_HAND_SWORD_TWO) ||
    (action >= PlayerAction.PLAYER_RAGE_FENRIR_WALK &&
      action <= PlayerAction.PLAYER_RAGE_FENRIR_STAND_ONE_LEFT)
  ) {
    return false;
  }
  return (
    (action >= PlayerAction.PLAYER_ATTACK_FIST &&
      action <= PlayerAction.PLAYER_RIDE_SKILL) ||
    (action >= PlayerAction.PLAYER_SKILL_SLEEP &&
      action <= PlayerAction.PLAYER_SKILL_LIGHTNING_SHOCK) ||
    action === PlayerAction.PLAYER_RECOVER_SKILL ||
    (action >= PlayerAction.PLAYER_SKILL_THRUST &&
      action <= PlayerAction.PLAYER_SKILL_HP_UP_OURFORCES)
  );
}

export function isOneShotPlayerAction(action: PlayerAction): boolean {
  return (
    isPlayerAttackAction(action) ||
    isPlayerSkillAction(action) ||
    isPlayerEmoteAction(action) ||
    action === PlayerAction.PLAYER_SHOCK
  );
}

export const ServerToClientActionMap: Partial<
  Record<ServerPlayerActionType, PlayerAction>
> = {
  [ServerPlayerActionType.Attack1]: PlayerAction.PLAYER_ATTACK_FIST,
  [ServerPlayerActionType.Attack2]: PlayerAction.PLAYER_ATTACK_FIST,
  [ServerPlayerActionType.Stand1]: PlayerAction.PLAYER_STOP_MALE,
  [ServerPlayerActionType.Stand2]: PlayerAction.PLAYER_STOP_MALE,
  [ServerPlayerActionType.Move1]: PlayerAction.PLAYER_WALK_MALE,
  [ServerPlayerActionType.Move2]: PlayerAction.PLAYER_WALK_MALE,
  [ServerPlayerActionType.Damage1]: PlayerAction.PLAYER_SHOCK,
  [ServerPlayerActionType.Die1]: PlayerAction.PLAYER_DIE1,
  [ServerPlayerActionType.Sit]: PlayerAction.PLAYER_SIT1,
  [ServerPlayerActionType.Healing]: PlayerAction.PLAYER_HEALING1,
  [ServerPlayerActionType.Pose]: PlayerAction.PLAYER_POSE1,
  [ServerPlayerActionType.Greeting]: PlayerAction.PLAYER_GREETING1,
  [ServerPlayerActionType.Goodbye]: PlayerAction.PLAYER_GOODBYE1,
  [ServerPlayerActionType.Clap]: PlayerAction.PLAYER_CLAP1,
  [ServerPlayerActionType.Gesture]: PlayerAction.PLAYER_GESTURE1,
  [ServerPlayerActionType.Direction]: PlayerAction.PLAYER_DIRECTION1,
  [ServerPlayerActionType.Unknown]: PlayerAction.PLAYER_UNKNOWN1,
  [ServerPlayerActionType.Cheer]: PlayerAction.PLAYER_CHEER1,
  [ServerPlayerActionType.See]: PlayerAction.PLAYER_SEE1,
  [ServerPlayerActionType.Win]: PlayerAction.PLAYER_WIN1,
  [ServerPlayerActionType.Smile]: PlayerAction.PLAYER_SMILE1,
  [ServerPlayerActionType.Sleep]: PlayerAction.PLAYER_SLEEP1,
  [ServerPlayerActionType.Cold]: PlayerAction.PLAYER_COLD1,
  [ServerPlayerActionType.Again]: PlayerAction.PLAYER_AGAIN1,
  [ServerPlayerActionType.Respect]: PlayerAction.PLAYER_RESPECT1,
  [ServerPlayerActionType.Salute]: PlayerAction.PLAYER_SALUTE1,
  [ServerPlayerActionType.Rush]: PlayerAction.PLAYER_RUSH1,
  [ServerPlayerActionType.Scissors]: PlayerAction.PLAYER_SCISSORS,
  [ServerPlayerActionType.Rock]: PlayerAction.PLAYER_ROCK,
  [ServerPlayerActionType.Paper]: PlayerAction.PLAYER_PAPER,
  [ServerPlayerActionType.Hustle]: PlayerAction.PLAYER_HUSTLE,
  [ServerPlayerActionType.Provocation]: PlayerAction.PLAYER_PROVOCATION,
  [ServerPlayerActionType.LookAround]: PlayerAction.PLAYER_LOOK_AROUND,
  [ServerPlayerActionType.Cheers]: PlayerAction.PLAYER_CHEERS,
  [ServerPlayerActionType.Jack1]: PlayerAction.PLAYER_JACK_1,
  [ServerPlayerActionType.Jack2]: PlayerAction.PLAYER_JACK_2,
  [ServerPlayerActionType.Santa1_1]: PlayerAction.PLAYER_SANTA_1,
  [ServerPlayerActionType.Santa1_2]: PlayerAction.PLAYER_SANTA_1,
  [ServerPlayerActionType.Santa1_3]: PlayerAction.PLAYER_SANTA_1,
  [ServerPlayerActionType.Santa2_1]: PlayerAction.PLAYER_SANTA_2,
  [ServerPlayerActionType.Santa2_2]: PlayerAction.PLAYER_SANTA_2,
  [ServerPlayerActionType.Santa2_3]: PlayerAction.PLAYER_SANTA_2,
};

export function resolveGenderedAction(
  action: PlayerAction,
  isFemale: boolean
): PlayerAction {
  if (!isFemale) return action;

  switch (action) {
    case PlayerAction.PLAYER_SIT1:
      return PlayerAction.PLAYER_SIT_FEMALE1;
    case PlayerAction.PLAYER_HEALING1:
      return PlayerAction.PLAYER_HEALING_FEMALE1;
    case PlayerAction.PLAYER_POSE1:
      return PlayerAction.PLAYER_POSE_FEMALE1;
    default:
      return genderedEmoteAction(action, isFemale);
  }
}
