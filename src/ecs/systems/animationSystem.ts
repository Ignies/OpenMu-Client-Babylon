import { MonsterActionType, PlayerAction } from '../../common/objects/enum';
import type { ISystemFactory } from '../world';
import type { PlayerObject } from '../../common/playerObject';
import { isOneShotPlayerAction } from '../../common/playerActionMapper';
import {
  chooseFenrirIdleAction,
  chooseFenrirRunAction,
  chooseFenrirWalkAction,
  chooseIdleAction,
  chooseRunAction,
  chooseWalkAction,
  isCrossbow,
  isSocialAction,
  isWeaponItem,
  type CharacterPose,
  type Hands,
} from '../../common/weaponClass';
import { applyWeaponAttachments } from '../../common/weaponAttachment';
import { TWFlags } from '../../common/terrain/consts';
import { isFlagInBinaryMask } from '../../common/utils';
import {
  monsterModelTypeOf,
  monsterPlaySpeed,
  playerPlaySpeed,
  wingsPlaySpeed,
} from '../../common/playSpeed';
import { attackSpeedOf, magicSpeedOf } from '../../common/characterStats';
import { BaseClass, getBaseClass } from '../../common/characterStats';
import { isFemaleClass } from '../../common/mapPlayerNetClassToModelClass';
import {
  FENRIR_RUN_DELAY,
  RUN_THRESHOLD,
  RUN_UNITS_PER_SECOND,
  canAccumulateRun,
  characterMoveSpeed,
  forcesRun,
  inBloodCastle,
  inChaosCastle,
  isSwimWorld,
} from '../../common/locomotion';
import { isWingItem } from '../../common/wings';
import { isRidingMount, petSpec } from '../../common/pets';
import { Store } from '../../store';

// Clip rates come from the original's PlaySpeed tables (common/playSpeed.ts);
// attack/cast rates additionally scale with the attackSpeed/magicSpeed
// attributes (agility / class divisor, plus nothing else yet).
// Death (delay, Die clip, corpse, fade, despawn) is owned by DeathSystem.

const MONSTER_ONE_SHOT_ACTIONS = new Set<MonsterActionType>([
  MonsterActionType.Attack1,
  MonsterActionType.Attack2,
  MonsterActionType.Attack3,
  MonsterActionType.Attack4,
  MonsterActionType.Shock,
  MonsterActionType.Appear,
]);

/** `GetEquipedBowType(c) == BOWTYPE_CROSSBOW` — picks the crossbow variants. */
function equippedCrossbow(hands: Hands | undefined): boolean {
  if (!hands) return false;
  return isCrossbow(hands.leftHand) || isCrossbow(hands.rightHand);
}

function isArmed(hands: Hands | undefined): boolean {
  if (!hands) return false;
  return isWeaponItem(hands.leftHand) || isWeaponItem(hands.rightHand);
}

export const AnimationSystem: ISystemFactory = world => {
  const playersQuery = world.with(
    'playerAnimation',
    'modelObject',
    'attributeSystem',
    'movement'
  );

  const playerAnimatableQuery = world.with('modelObject', 'playerAnimation');
  const monsterAnimatableQuery = world.with(
    'modelObject',
    'monsterAnimation',
    'movement',
    'modelObject'
  );

  /**
   * SetPlayerStop / SetPlayerWalk (ZzzCharacter.cpp:157-679) minus the Dark
   * Spirit. The order is the original's and it matters: Fenrir, then the
   * horse, the horns, wings, the swim worlds, and only then the weapon
   * switch — a winged character in Atlans flies, it does not swim.
   */
  function calculateAnimation(ctx: {
    pose: CharacterPose;
    inSafeZone: boolean;
    isMoving: boolean;
    run: number;
    wings: boolean;
    riding: boolean;
    /** The rider is on a Dark Horse, which has its own clip pair. */
    ridingHorse: boolean;
    /** The rider is on a Fenrir: weapon-split clips, run break at 20. */
    ridingFenrir: boolean;
    swimWorld: boolean;
  }): PlayerAction {
    const armed = isArmed(ctx.pose.hands);
    const crossbow = equippedCrossbow(ctx.pose.hands);
    const running = ctx.run >= RUN_THRESHOLD;

    // The Fenrir is tested first (SetPlayerStop:164-187, SetPlayerWalk:
    // 466-476): its own weapon-split families, breaking into the run clips
    // at FENRIR_RUN_DELAY instead of the usual 40.
    if (ctx.ridingFenrir && !ctx.inSafeZone) {
      if (!ctx.isMoving) return chooseFenrirIdleAction(ctx.pose);
      return ctx.run < FENRIR_RUN_DELAY
        ? chooseFenrirWalkAction(ctx.pose)
        : chooseFenrirRunAction(ctx.pose);
    }

    // The Dark Horse is tested before the horns and ignores the weapon
    // split — both arms of the original pick the same clip
    // (SetPlayerStop:189-195, SetPlayerWalk:477-480).
    if (ctx.ridingHorse && !ctx.inSafeZone) {
      return ctx.isMoving
        ? PlayerAction.PLAYER_RUN_RIDE_HORSE
        : PlayerAction.PLAYER_STOP_RIDE_HORSE;
    }

    // Horn of Uniria / Dinorant (SetPlayerStop:201-209, SetPlayerWalk:485-527).
    if (ctx.riding && !ctx.inSafeZone) {
      if (ctx.isMoving) {
        return armed
          ? PlayerAction.PLAYER_RUN_RIDE_WEAPON
          : PlayerAction.PLAYER_RUN_RIDE;
      }
      return armed
        ? PlayerAction.PLAYER_STOP_RIDE_WEAPON
        : PlayerAction.PLAYER_STOP_RIDE;
    }

    // Wings (`Fly`, SetPlayerStop:213-245; SetPlayerWalk:533-541).
    if (!ctx.inSafeZone && ctx.wings) {
      if (ctx.isMoving) {
        return crossbow
          ? PlayerAction.PLAYER_FLY_CROSSBOW
          : PlayerAction.PLAYER_FLY;
      }
      return crossbow
        ? PlayerAction.PLAYER_STOP_FLY_CROSSBOW
        : PlayerAction.PLAYER_STOP_FLY;
    }

    // Atlans / Hellas / Doppelganger 3. Standing there is the *fly* pose:
    // SetPlayerStop sets `Fly = true` for these maps outside a safe zone
    // (:218-219), which is what makes a character tread water.
    if (!ctx.inSafeZone && ctx.swimWorld) {
      if (ctx.isMoving) {
        return running
          ? PlayerAction.PLAYER_RUN_SWIM
          : PlayerAction.PLAYER_WALK_SWIM;
      }
      return crossbow
        ? PlayerAction.PLAYER_STOP_FLY_CROSSBOW
        : PlayerAction.PLAYER_STOP_FLY;
    }

    if (!ctx.isMoving) return chooseIdleAction(ctx.pose);

    return running ? chooseRunAction(ctx.pose) : chooseWalkAction(ctx.pose);
  }

  let lastRunTick = performance.now();

  return {
    update: dt => {
      // c->Run is a wall-clock walk-up (the original counts real frames at
      // its own FPS). The render dt is clamped to 0.1 s in main.tsx, so under
      // 10 fps the walker (already on wall-clock time) runs while this
      // counter would still say "walking" - use the real elapsed time, capped
      // so a stalled tab does not jump straight to running.
      const nowMs = performance.now();
      const runDt = Math.min(1, (nowMs - lastRunTick) / 1000);
      lastRunTick = nowMs;
      const mapIndex = world.mapIndex;
      const swimWorld = isSwimWorld(mapIndex);
      const chaosCastle = inChaosCastle(mapIndex);
      const bloodCastle = inBloodCastle(mapIndex);

      for (const entity of playersQuery) {
        const { playerAnimation, movement, attributeSystem, modelObject } = entity;

        // c->SafeZone is re-evaluated every frame from the terrain flag
        // (ZzzCharacter.cpp:5490); the path system alone left it stale after
        // spawns and teleports.
        if (entity.transform) {
          const flag = world.getTerrainFlag(
            ~~entity.transform.pos.x,
            ~~entity.transform.pos.z
          );
          attributeSystem.setValue(
            'inSafeZone',
            isFlagInBinaryMask(flag, TWFlags.SafeZone) ? 1 : 0
          );
        }

        if (entity.localPlayer) {
          // Server-computed speeds (CurrentStatsExtended) win over the
          // client-side agility formula once they have arrived.
          const pd = Store.playerData;
          attributeSystem.setValue(
            'attackSpeed',
            pd.attackSpeed ?? attackSpeedOf(pd.charClass, pd.agi)
          );
          attributeSystem.setValue(
            'magicSpeed',
            pd.magicSpeed ?? magicSpeedOf(pd.charClass, pd.agi)
          );
        }

        const inSafeZone = attributeSystem.isAboveZero('inSafeZone');
        const hands = entity.charAppearance;
        const wings = isWingItem(hands?.wings) ? hands!.wings : null;
        const mount = petSpec(hands?.pet);
        const riding = isRidingMount(hands?.pet);
        const ridingHorse = riding && mount?.riderClips === 'horse';
        const ridingFenrir = riding && mount?.riderClips === 'fenrir';

        // `c->Wing.Type != -1 && !SafeZone` (SetPlayerStop:213,
        // SetPlayerWalk:535). The swim worlds also set the original’s local
        // `Fly`, but not this flag: its consumers (the walk sound) want
        // "airborne", and swimming keeps its footstep.
        attributeSystem.setValue('isFlying', !inSafeZone && wings ? 1 : 0);
        attributeSystem.setValue('isSwimming', !inSafeZone && swimWorld ? 1 : 0);

        const moving = movement.velocity.x !== 0 || movement.velocity.y !== 0;

        // --- c->Run (ZzzCharacter.cpp:159, :376-408).
        const speedInput = {
          run: playerAnimation.run,
          inSafeZone,
          wings,
          riding,
          fenrir: ridingFenrir,
          fenrirUpgraded: (hands?.pet?.excellentFlags ?? 0) > 0,
          world: mapIndex,
        };

        if (!moving || inSafeZone) {
          // SetPlayerStop opens with `c->Run = 0`, and SetPlayerWalk zeroes it
          // again inside a safe zone.
          playerAnimation.run = 0;
        } else if (forcesRun(speedInput)) {
          // Wings, a mount and Chaos Castle skip the walk-up entirely
          // (`CharacterMoveSpeed` writes `c->Run = 40` outright).
          playerAnimation.run = RUN_THRESHOLD;
        } else if (
          playerAnimation.run < RUN_THRESHOLD &&
          // A player-rigged NPC (guards, Lumen…) has no c->Run walk-up: the
          // original moves NPCs with SetPlayerWalk on a MODEL_PLAYER object
          // whose Run stays 0, so a patrol is always PLAYER_WALK_*.
          entity.npcType === undefined &&
          canAccumulateRun(
            hands?.charClass ?? Store.playerData.charClass,
            hands?.boots,
            hands?.gloves,
            mapIndex,
            ridingFenrir
          )
        ) {
          playerAnimation.run = Math.min(
            RUN_THRESHOLD,
            playerAnimation.run + RUN_UNITS_PER_SECOND * runDt
          );
        }

        speedInput.run = playerAnimation.run;
        attributeSystem.setValue(
          'totalMovementSpeed',
          characterMoveSpeed(speedInput)
        );

        // Dinorant riders float 30 units off the terrain (:6263-6273).
        modelObject.HoverHeight =
          riding && !inSafeZone ? (mount?.riderLift ?? 0) : 0;

        // RenderCharacterBackItem: weapons ride on the back in safe zones,
        // during social actions and swim walks. Blood Castle and Chaos Castle
        // override it back to false (:14969-14980).
        const bindBack =
          !bloodCastle &&
          !chaosCastle &&
          (inSafeZone ||
            isSocialAction(playerAnimation.action) ||
            playerAnimation.action === PlayerAction.PLAYER_WALK_SWIM ||
            playerAnimation.action === PlayerAction.PLAYER_RUN_SWIM);
        if (attributeSystem.isAboveZero('weaponsOnBack') !== bindBack) {
          // Latch the flag only once the attachments were actually applied:
          // a character spawning already in a safe zone hits this before its
          // PlayerObject exists, and consuming the flip then would leave the
          // weapons on the hand links forever (the original re-evaluates
          // every frame, ZzzCharacter.cpp:14953).
          if ((modelObject as PlayerObject).Weapon1) {
            attributeSystem.setValue('weaponsOnBack', bindBack ? 1 : 0);
            applyWeaponAttachments(
              modelObject as PlayerObject,
              entity.charAppearance,
              bindBack
            );
          }
        }

        // Dead or about to die: c->Movement = false, no stop/walk re-evaluation.
        if (playerAnimation.action === PlayerAction.PLAYER_DIE1 || entity.dying) continue;

        if (isOneShotPlayerAction(playerAnimation.action) && !moving) {
          // Hold the one-shot clip until it has played through once, then
          // fall back to idle/walk (ActionIterationWasFinished is set by the
          // animation-group end observer in ModelObject). Walking cuts it
          // short: the original re-evaluates the walk action as soon as
          // c->Movement is set, so a swing never plays over a step.
          if (
            modelObject.CurrentAction !== playerAnimation.action ||
            !modelObject.ActionIterationWasFinished
          ) {
            continue;
          }
        }

        if (
          playerAnimation.action >= PlayerAction.PLAYER_SIT1 &&
          playerAnimation.action <= PlayerAction.PLAYER_POSE_FEMALE1 &&
          !moving
        ) {
          continue;
        }

        const npcClass =
          entity.npcType !== undefined
            ? ((modelObject.constructor as typeof PlayerObject).NpcClass ?? undefined)
            : undefined;
        const charClass =
          npcClass ?? hands?.charClass ?? Store.playerData.charClass;

        playerAnimation.action = calculateAnimation({
          pose: {
            hands,
            baseClass: getBaseClass(charClass),
            isFemale:
              npcClass !== undefined
                ? isFemaleClass(npcClass)
                : attributeSystem.isAboveZero('isFemale'),
            // "(no weapon) or (safe zone outside Blood Castle)" — the caller
            // side of the collapse is the safe zone; the no-weapon half is
            // tested inside chooseIdleAction / chooseWalkAction.
            weaponsStowed: inSafeZone && !bloodCastle,
            inChaosCastle: chaosCastle,
          },
          inSafeZone,
          isMoving: moving,
          run: playerAnimation.run,
          wings: !!wings,
          riding,
          ridingHorse,
          ridingFenrir,
          swimWorld,
        });
      }

      for (const entity of playerAnimatableQuery) {
        const { playerAnimation, modelObject } = entity;
        const playerObject = modelObject as PlayerObject;
        if (!playerObject.Ready) continue;

        const action = playerAnimation.action;
        const attrs = entity.attributeSystem;
        const isRageFighter =
          getBaseClass(
            entity.charAppearance?.charClass ?? Store.playerData.charClass
          ) === BaseClass.RageFighter;

        playerObject.AnimationSpeed =
          playerObject.actionPlaySpeed(action) ??
          playerPlaySpeed(
            action,
            attrs?.getValue('attackSpeed') ?? 0,
            attrs?.getValue('magicSpeed') ?? 0,
            isRageFighter
          );

        const oneShot =
          isOneShotPlayerAction(action) || action === PlayerAction.PLAYER_DIE1;
        playerObject.playAction(action, !oneShot);

        const wings = playerObject.Wings;
        if (wings?.Ready) {
          wings.setAnimationSpeed(wingsPlaySpeed(action, wings.spec));
          // The Wings of Darkness fold shut in town (:6785); every other
          // wing has a single flap clip.
          const folded =
            (entity.attributeSystem?.isAboveZero('inSafeZone') ?? false) &&
            wings.spec?.safeZoneAction !== undefined;
          wings.playAction(folded ? wings.spec!.safeZoneAction! : 0, true);
        }

        // The Imp flaps at its own fixed rate (ZzzCharacter.cpp:15149).
        const pet = playerObject.Pet;
        if (pet?.Ready) {
          const spec = petSpec(entity.charAppearance?.pet);
          pet.setAnimationSpeed(spec?.playSpeed ?? 0.25);
          pet.playAction(0, true);
        }
      }

      for (const entity of monsterAnimatableQuery) {
        const { monsterAnimation, movement, modelObject } = entity;
        if (!modelObject.Ready) continue;

        if (monsterAnimation.action === MonsterActionType.Die) {
          // Death: play once and hold the last frame; DeathSystem fades and despawns.
          modelObject.AnimationSpeed =
            modelObject.actionPlaySpeed(MonsterActionType.Die) ??
            monsterPlaySpeed(monsterModelTypeOf(entity.npcType), MonsterActionType.Die);
          modelObject.playAction(MonsterActionType.Die, false);
          continue;
        }
        // Killed but the Die clip has not started yet (death delay): freeze.
        if (entity.dying) continue;

        const oneShot = MONSTER_ONE_SHOT_ACTIONS.has(monsterAnimation.action);
        if (
          oneShot &&
          modelObject.CurrentAction === monsterAnimation.action &&
          modelObject.ActionIterationWasFinished
        ) {
          monsterAnimation.action = MonsterActionType.Stop1;
        }

        const isMoving = movement.velocity.x !== 0 || movement.velocity.y !== 0;
        if (isMoving && !MONSTER_ONE_SHOT_ACTIONS.has(monsterAnimation.action)) {
          monsterAnimation.action = MonsterActionType.Walk;
        } else if (!isMoving && monsterAnimation.action === MonsterActionType.Walk) {
          // Path consumed: the original returns to MONSTER01_STOP1 when the
          // walk ends (MoveHumen); the server never sends a "stop" animation.
          monsterAnimation.action = MonsterActionType.Stop1;
        }

        const action = monsterAnimation.action;
        modelObject.AnimationSpeed =
          modelObject.actionPlaySpeed(action) ??
          monsterPlaySpeed(monsterModelTypeOf(entity.npcType), action);
        modelObject.playAction(action, !MONSTER_ONE_SHOT_ACTIONS.has(action));
      }
    },
  };
};
