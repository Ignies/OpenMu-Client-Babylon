import type { ISystemFactory } from '../world';
import { MonsterActionType, PlayerAction } from '../../common/objects/enum';
import { isPlayerAttackAction } from '../../common/playerActionMapper';
import { monsterModelTypeOf } from '../../common/playSpeed';
import type { CharacterClassNumber } from '../../common/types';
import {
  MONSTER_ASSASSIN,
  monsterAttackSound,
  monsterDeathSound,
  monsterIdleSound,
  playerDeathSound,
  playerPainSound,
  playerSwingSound,
} from '../../common/combatSounds';
import { playSfx, setSfxListener } from '../../libs/sfx';
import { Store } from '../../store';

/**
 * Plays the sounds the original client fires on `AnimationFrame == 0` of a
 * freshly set action (SetPlayerStop / SetPlayerWalk / SetPlayerAttack /
 * SetPlayerShock / SetPlayerDie, ZzzCharacter.cpp:347, :706, :1196, :1321,
 * :1452): every entity's ModelObject bumps `actionSerial` when a clip
 * (re)starts, and this system reacts to the bump.
 *
 * Monster idle / walk chatter is `rand_fps_check(16)` at the moment the
 * action is set, i.e. a 1-in-16 roll per stop/walk transition — not a
 * per-frame roll.
 */

const IDLE_CHATTER_CHANCE = 1 / 16;

export const CombatSfxSystem: ISystemFactory = world => {
  const query = world.with('modelObject', 'transform');
  const seen = new WeakMap<object, number>();

  function classOf(e: (typeof query.entities)[number]): CharacterClassNumber {
    return (
      e.charAppearance?.charClass ??
      (e.localPlayer ? Store.playerData.charClass : undefined) ??
      (e.attributeSystem?.getValue('playerNetClass') as CharacterClassNumber)
    );
  }

  return {
    update: () => {
      const hero = world.playerEntity;
      if (hero) setSfxListener(hero.transform.pos.x, hero.transform.pos.z);

      for (const e of query) {
        const model = e.modelObject;
        const serial = model.actionSerial;
        const prev = seen.get(model);
        if (prev === serial) continue;
        seen.set(model, serial);
        // First sighting: the spawn pose is not an event.
        if (prev === undefined) continue;

        const pos = e.transform.pos;
        const action = model.CurrentAction;

        if (e.monsterAnimation) {
          const type = monsterModelTypeOf(e.npcType);
          switch (action) {
            case MonsterActionType.Attack1:
            case MonsterActionType.Attack2:
            case MonsterActionType.Attack3:
            case MonsterActionType.Attack4: {
              const sfx = monsterAttackSound(type);
              if (sfx) playSfx(sfx, pos);
              break;
            }
            case MonsterActionType.Shock: {
              if (type === MONSTER_ASSASSIN) break;
              const sfx = monsterAttackSound(type);
              if (sfx) playSfx(sfx, pos);
              break;
            }
            case MonsterActionType.Die: {
              const sfx = monsterDeathSound(type);
              if (sfx) playSfx(sfx, pos);
              break;
            }
            case MonsterActionType.Stop1:
            case MonsterActionType.Walk: {
              if (Math.random() >= IDLE_CHATTER_CHANCE) break;
              const sfx = monsterIdleSound(type);
              if (sfx) playSfx(sfx, pos);
              break;
            }
          }
        } else if (e.playerAnimation) {
          if (isPlayerAttackAction(action)) {
            const sfx = playerSwingSound(e.charAppearance);
            if (sfx) playSfx(sfx, pos);
          } else if (action === PlayerAction.PLAYER_SHOCK) {
            playSfx(playerPainSound(classOf(e)), pos);
          } else if (
            action === PlayerAction.PLAYER_DIE1 ||
            action === PlayerAction.PLAYER_DIE2
          ) {
            playSfx(playerDeathSound(classOf(e)), pos);
          }
        }
      }
    },
  };
};
