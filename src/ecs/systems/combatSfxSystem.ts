import type { ISystemFactory } from '../world';
import { MonsterActionType, PlayerAction } from '../../common/objects/enum';
import { isPlayerAttackAction } from '../../common/playerActionMapper';
import { monsterModelTypeOf } from '../../common/playSpeed';
import type { CharacterClassNumber } from '../../common/types';
import {
  COMBAT_BUS,
  MONSTER_ASSASSIN,
  MONSTER_BUS,
  monsterAttackSound,
  monsterDeathSound,
  monsterIdleSound,
  playerDeathSound,
  playerPainSound,
  playerSwingSound,
} from '../../common/combatSounds';
import { playSfx, setSfxListener } from '../../libs/sfx';
import {
  MAP_VOICE_RANGE_TILES,
  mapMonsterCues,
  type MonsterCue,
} from '../../sound/mapMonsters';
import { Store } from '../../store';

/**
 * Plays the sounds the original client fires on `AnimationFrame == 0` of a
 * freshly set action (SetPlayerStop / SetPlayerWalk / SetPlayerAttack /
 * SetPlayerShock / SetPlayerDie, ZzzCharacter.cpp:347, :706, :1196, :1321,
 * :1452): every entity's ModelObject bumps `actionSerial` when a clip
 * (re)starts, and this system reacts to the bump.
 *
 * Monster idle / walk chatter is `rand_fps_check(16)` at the moment the
 * action is set, i.e. a 1-in-16 roll per stop/walk transition - not a
 * per-frame roll.
 */

const IDLE_CHATTER_CHANCE = 1 / 16;

/** `rand_fps_check(2) ? a : b`, or the single sound a cue carries. */
function cueSound(cue: MonsterCue) {
  return Array.isArray(cue.play)
    ? cue.play[Math.random() < 0.5 ? 0 : 1]
    : (cue.play as Exclude<MonsterCue['play'], readonly unknown[]>);
}

/** `if (fDistance > 500.0f) return true` - the map voices' hard cutoff. */
function inMapVoiceRange(
  hero: { transform: { pos: { x: number; z: number } } } | null | undefined,
  pos: { x: number; z: number }
): boolean {
  if (!hero) return false;
  return (
    Math.hypot(pos.x - hero.transform.pos.x, pos.z - hero.transform.pos.z) <=
    MAP_VOICE_RANGE_TILES
  );
}

export const CombatSfxSystem: ISystemFactory = world => {
  const query = world.with('modelObject', 'transform');
  const seen = new WeakMap<object, number>();
  /** Frame-window cues already fired for the clip the model is playing. */
  const stepped = new WeakMap<object, boolean[]>();

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
        const started = prev !== serial;

        const pos = e.transform.pos;
        const action = model.CurrentAction;

        // The per-map voices (`PlayMonsterSound`) run before the generic
        // table and, unlike it, have footstep cues that fire mid-clip - so
        // they are stepped every frame, not only when the clip changes.
        if (e.monsterAnimation && prev !== undefined) {
          // `TheMapProcess()` is the map the hero is standing on, not a
          // property of the monster.
          const cues = mapMonsterCues(world.mapIndex, monsterModelTypeOf(e.npcType));

          if (cues && inMapVoiceRange(hero, pos)) {
            let fired = stepped.get(model);
            if (started || !fired || fired.length !== cues.length) {
              fired = new Array(cues.length).fill(false);
              stepped.set(model, fired);
            }

            for (let i = 0; i < cues.length; i++) {
              const cue = cues[i];
              if (!cue.on.includes(action as MonsterActionType)) continue;

              if (cue.frame) {
                const f = model.actionFrame();
                const inside = f >= cue.frame[0] && f < cue.frame[1];
                if (!inside) {
                  fired[i] = false;
                  continue;
                }
                if (fired[i]) continue;
                fired[i] = true;
              } else if (!started) {
                continue;
              } else if (cue.chance && Math.random() >= 1 / cue.chance) {
                continue;
              }

              playSfx(cueSound(cue), pos, { bus: MONSTER_BUS });
            }
          }
        }

        if (!started) continue;
        seen.set(model, serial);
        // First sighting: the spawn pose is not an event.
        if (prev === undefined) continue;

        if (e.monsterAnimation) {
          const type = monsterModelTypeOf(e.npcType);
          switch (action) {
            case MonsterActionType.Attack1:
            case MonsterActionType.Attack2:
            case MonsterActionType.Attack3:
            case MonsterActionType.Attack4: {
              const sfx = monsterAttackSound(type);
              if (sfx) playSfx(sfx, pos, { bus: MONSTER_BUS });
              break;
            }
            case MonsterActionType.Shock: {
              if (type === MONSTER_ASSASSIN) break;
              const sfx = monsterAttackSound(type);
              if (sfx) playSfx(sfx, pos, { bus: MONSTER_BUS });
              break;
            }
            case MonsterActionType.Die: {
              const sfx = monsterDeathSound(type);
              if (sfx) playSfx(sfx, pos, { bus: MONSTER_BUS });
              break;
            }
            case MonsterActionType.Stop1:
            case MonsterActionType.Walk: {
              if (Math.random() >= IDLE_CHATTER_CHANCE) break;
              const sfx = monsterIdleSound(type);
              if (sfx) playSfx(sfx, pos, { bus: MONSTER_BUS });
              break;
            }
          }
        } else if (e.playerAnimation) {
          if (isPlayerAttackAction(action)) {
            const sfx = playerSwingSound(e.charAppearance);
            if (sfx) playSfx(sfx, pos, { bus: COMBAT_BUS });
          } else if (action === PlayerAction.PLAYER_SHOCK) {
            playSfx(playerPainSound(classOf(e)), pos, { bus: COMBAT_BUS });
          } else if (
            action === PlayerAction.PLAYER_DIE1 ||
            action === PlayerAction.PLAYER_DIE2
          ) {
            playSfx(playerDeathSound(classOf(e)), pos, { bus: COMBAT_BUS });
          }
        }
      }
    },
  };
};
