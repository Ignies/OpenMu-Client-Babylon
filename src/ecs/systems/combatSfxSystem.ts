import type { ISystemFactory } from '../world';
import { MonsterActionType, PlayerAction } from '../../common/objects/enum';
import {
  isPlayerAttackAction,
  isStandingIdle,
} from '../../common/playerActionMapper';
import { monsterModelTypeOf } from '../../common/playSpeed';
import { isPlayerBody } from '../../common/playerObject';
import { HORN_OF_FENRIR, PET_GROUP } from '../../common/petConstants';
import type { CharacterClassNumber } from '../../common/types';
import { CHAOS_CASTLE_WORLDS } from '../../common/worldAssets';
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
import {
  playSfx,
  setSfxListener,
  type SfxOptions,
  type SfxPosition,
} from '../../libs/sfx';
import type { Sounds } from '../../sound/recipes';
import {
  MAP_VOICE_RANGE_TILES,
  fpsCheck,
  mapMonsterCues,
  newCueState,
  playSpawnCues,
  stepCues,
  type CuePlayer,
  type CueState,
} from '../../sound/mapMonsters';
import { MonsterAttackEffects } from '../../sound/monsterEffects';
import { Store } from '../../store';

/**
 * Plays the sounds the original client fires from SetPlayerStop /
 * SetPlayerWalk / SetPlayerAttack / SetPlayerShock / SetPlayerDie
 * (ZzzCharacter.cpp:238, :453, :1196, :1321, :1452) and from the idle clip
 * looping (:3734). Every entity's ModelObject bumps `actionSerial` when a clip
 * (re)starts; attack, flinch and death voices answer that bump.
 *
 * Walking is different: the original calls SetPlayerWalk every frame a
 * character moves (:6439), so the walk voices are per-frame rolls at its
 * 25 fps reference rather than one roll per step of the path. What keeps that
 * from becoming a chorus is the channel count each wave was loaded with,
 * which `playSfx` enforces. The per-map move / render hook voices step the
 * same way, through `stepCues`.
 */

/** `int Channel = 2` for every wave `OpenMonsterModel` loads (ZzzOpenData.cpp:3374). */
const MONSTER_VOICE_CHANNELS = 2;
/** SetPlayerStop's `rand_fps_check(16)` (ZzzCharacter.cpp:428), one roll as it stops. */
const STOP_CHATTER_ONE_IN = 16;
/** SetPlayerWalk's `rand_fps_check(16)`, 64 for the hero in a monster body (:787). */
const WALK_CHATTER_ONE_IN = 16;
const HERO_WALK_CHATTER_ONE_IN = 64;
/** MODEL_BALROG rattles its bones while it walks instead of talking (:761). */
const BALROG_MODEL = 27;
const BALROG_WALK: Sounds = 'Sound/mBone2';

const HORSE_STEPS: readonly Sounds[] = ['Sound/pHorseStep1', 'Sound/pHorseStep2', 'Sound/pHorseStep3'];
const FENRIR_RUN: readonly Sounds[] = ['Sound/pW_run-01', 'Sound/pW_run-02', 'Sound/pW_run-03'];
// The walk clips reuse the first two run waves; pW_step is loaded but never played (:777-786).
const FENRIR_WALK: readonly Sounds[] = ['Sound/pW_run-01', 'Sound/pW_run-02'];
const FENRIR_IDLE: readonly Sounds[] = ['Sound/pWidle1', 'Sound/pWidle2'];
const CHAOS_CASTLE_DEATH: readonly Sounds[] = ['Sound/eMonsterBoom1', 'Sound/eMonsterBoom2'];

const A = PlayerAction;

/** Attack clips SetPlayerAttack picks outside the on-foot range: the swing plays for them too. */
const MOUNTED_ATTACK_CLIPS: ReadonlySet<number> = new Set([
  A.PLAYER_FENRIR_ATTACK,
  A.PLAYER_FENRIR_ATTACK_TWO_SWORD,
  A.PLAYER_FENRIR_ATTACK_DARKLORD_SWORD,
  A.PLAYER_FENRIR_ATTACK_CROSSBOW,
  A.PLAYER_FENRIR_ATTACK_SPEAR,
  A.PLAYER_FENRIR_ATTACK_ONE_SWORD,
  A.PLAYER_FENRIR_ATTACK_BOW,
  A.PLAYER_ATTACK_RIDE_HORSE_SWORD,
  A.PLAYER_ATTACK_TWO_HAND_SWORD_TWO,
]);

const between = (a: number, lo: number, hi: number) => a >= lo && a <= hi;

function fenrirRun(a: number): boolean {
  return (
    between(a, A.PLAYER_FENRIR_RUN, A.PLAYER_FENRIR_RUN_ONE_LEFT_ELF) ||
    between(a, A.PLAYER_RAGE_FENRIR_RUN, A.PLAYER_RAGE_FENRIR_RUN_ONE_LEFT)
  );
}
function fenrirWalk(a: number): boolean {
  return (
    between(a, A.PLAYER_FENRIR_WALK, A.PLAYER_FENRIR_WALK_ONE_LEFT) ||
    between(a, A.PLAYER_RAGE_FENRIR_WALK, A.PLAYER_RAGE_FENRIR_WALK_TWO_SWORD)
  );
}
function fenrirStand(a: number): boolean {
  return (
    between(a, A.PLAYER_FENRIR_STAND, A.PLAYER_FENRIR_STAND_ONE_LEFT) ||
    between(a, A.PLAYER_RAGE_FENRIR_STAND, A.PLAYER_RAGE_FENRIR_STAND_ONE_LEFT)
  );
}
function fenrirDamage(a: number): boolean {
  return (
    between(a, A.PLAYER_FENRIR_DAMAGE, A.PLAYER_FENRIR_DAMAGE_ONE_LEFT) ||
    between(a, A.PLAYER_RAGE_FENRIR_DAMAGE, A.PLAYER_RAGE_FENRIR_DAMAGE_ONE_LEFT)
  );
}

const STEP_OPTS: SfxOptions = { bus: 'steps', channels: 1 };

const oneIn = (n: number) => Math.random() * n < 1;
const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/** One options object per channel count, so a voice allocates nothing per play. */
const voiceOpts: SfxOptions[] = [];
function voiceOptsFor(channels = MONSTER_VOICE_CHANNELS): SfxOptions {
  return (voiceOpts[channels] ??= { bus: MONSTER_BUS, channels });
}

function playVoice(key: Sounds, at: SfxPosition): number {
  return playSfx(key, at, voiceOptsFor());
}

const playCue: CuePlayer<SfxPosition> = (key, channels, at) =>
  playSfx(key, at, voiceOptsFor(channels));

/** `o->AnimationFrame`; a one-shot that has run out holds past every window. */
function frameOf(model: {
  actionFrame(): number;
  ActionIterationWasFinished: boolean;
  LoopAction: boolean;
}): number {
  return model.ActionIterationWasFinished && !model.LoopAction ? Infinity : model.actionFrame();
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
  const cueStates = new WeakMap<object, CueState>();
  /** When a repeating per-entity sound (the Balrog's bones) ends. */
  const loopUntil = new WeakMap<object, number>();
  const attackEffects = new MonsterAttackEffects<SfxPosition>(playCue);

  function classOf(e: (typeof query.entities)[number]): CharacterClassNumber {
    return (
      e.charAppearance?.charClass ??
      (e.localPlayer ? Store.playerData.charClass : undefined) ??
      (e.attributeSystem?.getValue('playerNetClass') as CharacterClassNumber)
    );
  }

  function ridesFenrir(e: (typeof query.entities)[number]): boolean {
    const pet = e.charAppearance?.pet;
    return !!pet && pet.group === PET_GROUP && pet.num === HORN_OF_FENRIR;
  }

  return {
    update: (dt: number) => {
      const hero = world.playerEntity;
      if (hero) setSfxListener(hero.transform.pos.x, hero.transform.pos.z);
      const now = performance.now();
      const chaosCastle = CHAOS_CASTLE_WORLDS.includes(world.mapIndex);
      attackEffects.drain(now, world.mapIndex);

      for (const e of query) {
        const model = e.modelObject;
        const serial = model.actionSerial;
        const prev = seen.get(model);
        const started = prev !== serial;
        if (started) seen.set(model, serial);
        // First sighting: the spawn pose is not an event, the spawn itself may be.
        if (prev === undefined) {
          if (e.monsterAnimation) {
            const cues = mapMonsterCues(world.mapIndex, monsterModelTypeOf(e.npcType ?? e.skin));
            if (cues) playSpawnCues(cues, e.transform.pos, playCue);
          }
          continue;
        }

        const pos = e.transform.pos;
        const action = model.CurrentAction;

        // A transformation ring makes the wearer a monster object in the
        // original (WSclient.cpp:2765): it is voiced as the monster it wears.
        if (e.monsterAnimation || (e.playerAnimation && !isPlayerBody(model))) {
          const npc = e.npcType ?? e.skin;
          const type = monsterModelTypeOf(npc);
          const walking =
            action === MonsterActionType.Walk || action === MonsterActionType.Run;

          // `PlayMonsterSound` runs before the generic table (:215-236);
          // `TheMapProcess()` is the map the hero is on, not the monster's.
          const cues = mapMonsterCues(world.mapIndex, type);
          if (cues) {
            const frame = frameOf(model);
            let s = cueStates.get(model);
            if (!s || s.fired.length !== cues.length) {
              s = newCueState(cues.length, frame);
              cueStates.set(model, s);
            }
            const inRange = inMapVoiceRange(hero, pos);
            const drawn = !model.OutOfView;
            stepCues(s, cues, action, started, frame, dt, now, inRange, drawn, pos, playCue);
          }
          // AttackEffect runs for every live monster, drawn or not (:4133).
          if (e.monsterAnimation) attackEffects.note(e, npc, world.mapIndex, model, pos, now);

          if (walking) {
            if (type === BALROG_MODEL) {
              if (now >= (loopUntil.get(model) ?? 0)) {
                loopUntil.set(model, now + playVoice(BALROG_WALK, pos));
              }
            } else if (fpsCheck(e.localPlayer ? HERO_WALK_CHATTER_ONE_IN : WALK_CHATTER_ONE_IN, dt)) {
              const sfx = monsterIdleSound(type, npc);
              if (sfx) playVoice(sfx, pos);
            }
            continue;
          }
          if (!started) continue;

          switch (action) {
            case MonsterActionType.Attack1:
            case MonsterActionType.Attack2:
            case MonsterActionType.Attack3:
            case MonsterActionType.Attack4: {
              const sfx = monsterAttackSound(type, npc);
              if (sfx) playVoice(sfx, pos);
              break;
            }
            case MonsterActionType.Shock: {
              if (type === MONSTER_ASSASSIN) break;
              const sfx = monsterAttackSound(type, npc);
              if (sfx) playVoice(sfx, pos);
              break;
            }
            case MonsterActionType.Die: {
              // Chaos Castle swaps every death for a burst (:1537-1540).
              const sfx = chaosCastle ? pick(CHAOS_CASTLE_DEATH) : monsterDeathSound(type, npc);
              if (sfx) playVoice(sfx, pos);
              break;
            }
            case MonsterActionType.Stop1: {
              if (!oneIn(STOP_CHATTER_ONE_IN)) break;
              const sfx = monsterIdleSound(type, npc);
              if (sfx) playVoice(sfx, pos);
              break;
            }
          }
        } else if (e.playerAnimation) {
          // Hooves and paws, re-issued every frame the rider moves outside a
          // safe zone (:761-786); one channel per wave keeps it a gallop.
          const steps =
            action === A.PLAYER_RUN_RIDE_HORSE
              ? HORSE_STEPS
              : fenrirRun(action)
                ? FENRIR_RUN
                : fenrirWalk(action)
                  ? FENRIR_WALK
                  : null;
          if (steps) playSfx(pick(steps), pos, STEP_OPTS);

          if (!started) continue;

          if (isPlayerAttackAction(action) || MOUNTED_ATTACK_CLIPS.has(action)) {
            const sfx = playerSwingSound(e.charAppearance);
            if (sfx) playSfx(sfx, pos, { bus: COMBAT_BUS });
          } else if (action === A.PLAYER_SHOCK || fenrirDamage(action)) {
            playSfx(playerPainSound(classOf(e)), pos, { bus: COMBAT_BUS });
            // 1 in 3, and half of those land on a slot that was never loaded (:1386-1387).
            if (fenrirDamage(action) && oneIn(6)) {
              playSfx('Sound/pWpain2', pos, { bus: COMBAT_BUS, channels: 1 });
            }
          } else if (action === A.PLAYER_DIE1 || action === A.PLAYER_DIE2) {
            if (chaosCastle) {
              playSfx(pick(CHAOS_CASTLE_DEATH), pos, { bus: COMBAT_BUS, channels: 2 });
            } else {
              playSfx(playerDeathSound(classOf(e)), pos, { bus: COMBAT_BUS });
              if (ridesFenrir(e)) playSfx('Sound/pWdeath', pos, { bus: COMBAT_BUS, channels: 1 });
            }
          } else if (
            (isStandingIdle(action) || fenrirStand(action)) &&
            ridesFenrir(e) &&
            oneIn(STOP_CHATTER_ONE_IN * 3)
          ) {
            playSfx(pick(FENRIR_IDLE), pos, { bus: COMBAT_BUS, channels: 1 });
          }
        }
      }
    },
  };
};
