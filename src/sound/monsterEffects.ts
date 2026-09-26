import { inHellas } from '../common/locomotion';
import { monsterAttackState, type MonsterAttackState } from '../common/monsterAttackClip';
import { MonsterActionType as A } from '../common/objects/enum';
import { REFERENCE_FPS } from '../common/playSpeed';
import type { CuePlayer } from './mapMonsters';
import type { Sounds } from './recipes';

/**
 * The sounds `AttackEffect` (ZzzCharacter.cpp:1589-2410) and Kalima's
 * `AttackEffect_HellasMonster` (GMHellas.cpp:1065-1372) play on a tick of a
 * monster's AttackTime, by `c->MonsterIndex` and `c->Skill`. AttackTime starts
 * at 1 on a swing or cast and counts 25 fps ticks to 15 (:4132-4142), and
 * `monsterAttackClip` stamps each start + 14 ticks as `skillClearsAt`.
 * Bare `PlayBuffer`s, so no five-tile gate (as mapMonsters' ATTACK_EFFECT).
 * OpenMU's monster skill is 150, never AT_SKILL_BOSS (50): the boss rows
 * stay silent against it.
 */

/** One `PlayBuffer` on one AttackTime tick. */
export type AttackEffectSound = {
  readonly play: Sounds;
  /** `CheckAttackTime(n)`. */
  readonly tick: number;
  /** The `c->Skill` values it answers; unset answers any. */
  readonly skills?: readonly number[];
  /** Silent when the clip playing at the tick is this one. */
  readonly notAction?: A;
  /** The wave's `LoadWaveFile` channel count. */
  readonly channels: number;
};

/** g_iLimitAttackTime (ZzzCharacter.cpp:171). */
const LIMIT_ATTACK_TIME = 15;
const TICK_MS = 1000 / REFERENCE_FPS;

// ActionSkillType (_enum.h:309)
const SKILL_POISON = 1;
const SKILL_LIGHTNING = 3;
const SKILL_ENERGYBALL = 17;
const SKILL_BOSS = 50;
const SKILL_FIRE_SLASH = 55;
const SKILL_MONSTER_MAGIC_DEF = 201;
const SKILL_MONSTER_PHY_DEF = 202;
const SKILL_LIGHTNING_STR = 379;
const SKILL_POISON_STR = 384;
const SKILL_LIGHTNING_STR_MG = 480;
const SKILL_FIRE_SLASH_STR = 490;

const BOSS = [SKILL_BOSS];
const ENERGYBALL = [SKILL_ENERGYBALL];
const LIGHTNING = [SKILL_LIGHTNING, SKILL_LIGHTNING_STR, SKILL_LIGHTNING_STR_MG];

// Channels: ZzzOpenData.cpp:4804-4816, and MapManager.cpp:1005-1007 in Kalima.
const EVIL = { play: 'Sound/sEvil', channels: 2 } as const;
const HELLFIRE = { play: 'Sound/sHellFire', channels: 2 } as const;
const METEORITE = { play: 'Sound/eMeteorite', channels: 2 } as const;
const THUNDER = { play: 'Sound/eThunder', channels: 1 } as const;
const SKULL = { play: 'Sound/eSkull', channels: 1 } as const;
const GREAT_POISON = { play: 'Sound/eGreatPoison', channels: 1 } as const;
const GREAT_SHIELD = { play: 'Sound/eGreatShield', channels: 1 } as const;

// A `rand_fps_check` meteor re-issued every frame was two copies 40 ms apart
// on eMeteorite's two channels: it plays once per AttackTime here.
// No lightning row: ReceiveMagic's eThunder (WSclient.cpp:4279) still holds
// the wave's one channel when :2264 asks for it.
const MAGIC_SKELETON: readonly AttackEffectSound[] = [
  { ...METEORITE, tick: 1, skills: BOSS }, // :1671
];
// Fire breath on any clip but Attack1 (:1769). Tick 13 beats AttackStage's
// frame-5 cut (:3049-3062) at the 0.33 keys a tick its clip runs.
const DRAKAN: readonly AttackEffectSound[] = [
  { ...METEORITE, tick: 13, notAction: A.Attack1 },
];
const BALROG: readonly AttackEffectSound[] = [
  { ...HELLFIRE, tick: 1, skills: BOSS }, // :1981
  { ...METEORITE, tick: 1, skills: BOSS }, // :1989, per frame
];

/** `c->MonsterIndex` -> the switch's sounds, then its `c->TargetCharacter` half. */
const GENERIC: Readonly<Record<number, readonly AttackEffectSound[]>> = {
  // DEATH_GORGON (:1968)
  35: [{ ...METEORITE, tick: 1, skills: BOSS }],
  // DEVIL - Energy Ball (:2205) and Lightning (:2297)
  37: [{ ...EVIL, tick: 1, skills: [...ENERGYBALL, ...LIGHTNING] }],
  38: BALROG,
  // RED_DRAGON - tick 1 and the per-frame roll land together (:1947, :1954)
  42: [{ ...METEORITE, tick: 1, skills: BOSS }],
  // VEPAR (:2185)
  46: [{ ...EVIL, tick: 1, skills: ENERGYBALL }],
  // BEAM_KNIGHT: :2177 never plays, the switch's own case spends tick 1 (:1839-1843).
  // CURSED_KING (:2226)
  66: [{ ...THUNDER, tick: 1, skills: ENERGYBALL }],
  // METAL_BALROG
  67: BALROG,
  // DRAKAN / GREAT_DRAKAN
  73: DRAKAN,
  75: DRAKAN,
  // MAGIC_SKELETON_1..7 (8 is in no case)
  89: MAGIC_SKELETON,
  95: MAGIC_SKELETON,
  112: MAGIC_SKELETON,
  118: MAGIC_SKELETON,
  124: MAGIC_SKELETON,
  130: MAGIC_SKELETON,
  143: MAGIC_SKELETON,
  // METEORITE_TRAP (:1998) is packetSounds' METEORITE_STORM, played from the 0x19.
};

/**
 * CreateMonsterSkill_ReduceDef / _Poison (GMHellas.cpp:686-729) re-issue
 * their wave every frame from tick 13 on; one channel held it to one play.
 */
const HELLAS_CASTER: readonly AttackEffectSound[] = [
  { ...SKULL, tick: 13, skills: [SKILL_FIRE_SLASH, SKILL_FIRE_SLASH_STR] },
  { ...GREAT_POISON, tick: 13, skills: [SKILL_POISON, SKILL_POISON_STR] },
  { ...GREAT_SHIELD, tick: 13, skills: [SKILL_MONSTER_MAGIC_DEF, SKILL_MONSTER_PHY_DEF] },
];

/** Behind `InHellas()`: Death Centurion 1-6, Illusion of Kundun 1-5 and 7 (not 6). */
const HELLAS: Readonly<Record<number, readonly AttackEffectSound[]>> = Object.fromEntries(
  [145, 175, 183, 191, 261, 269, 161, 181, 189, 197, 267, 275].map(n => [n, HELLAS_CASTER])
);

const ANY = new Set([...Object.keys(GENERIC), ...Object.keys(HELLAS)].map(Number));

/** What `AttackEffect` plays for this monster on this map, or null. */
export function attackEffectSounds(
  world: number,
  monster: number
): readonly AttackEffectSound[] | null {
  if (inHellas(world) && HELLAS[monster]) return HELLAS[monster];
  return GENERIC[monster] ?? null;
}

/** The monster; the original deletes one that leaves scope, AttackTime and all. */
export type EffectOwner = { readonly objOutOfScope?: boolean };

/** The clip in hand at a tick: `o->CurrentAction`. */
export type ClipSource = { readonly CurrentAction: number };

function answers(sound: AttackEffectSound, skill: number, clip: ClipSource): boolean {
  if (sound.skills && !sound.skills.includes(skill)) return false;
  return sound.notAction === undefined || clip.CurrentAction !== sound.notAction;
}

type Pending<P> = {
  readonly sound: AttackEffectSound;
  readonly owner: EffectOwner;
  readonly state: MonsterAttackState;
  /** The stamp of the AttackTime it belongs to. */
  readonly mark: number;
  readonly clip: ClipSource;
  readonly at: P;
  readonly world: number;
  readonly due: number;
};

/** A tick past this many waiting is dropped. */
const MAX_PENDING = 32;

/**
 * One per system: tick 1 plays as the AttackTime is seen, later ticks wait
 * in a time-ordered queue drained once a frame.
 */
export class MonsterAttackEffects<P> {
  readonly #play: CuePlayer<P>;
  readonly #seen = new WeakMap<MonsterAttackState, number>();
  readonly #queue: Pending<P>[] = [];

  constructor(play: CuePlayer<P>) {
    this.#play = play;
  }

  /**
   * One frame of one monster: answers an AttackTime that started since the
   * last. Allocation-free unless it queues a tick.
   */
  note(
    owner: EffectOwner,
    monster: number | undefined,
    world: number,
    clip: ClipSource,
    at: P,
    now: number
  ): void {
    if (monster === undefined || !ANY.has(monster)) return;
    const state = monsterAttackState(owner);
    const mark = state.skillClearsAt;
    if (this.#seen.get(state) === mark) return;
    this.#seen.set(state, mark);
    // Infinity: none runs; a stamp already past ran out unseen.
    if (mark === Infinity || mark <= now) return;

    const sounds = attackEffectSounds(world, monster);
    if (!sounds) return;
    for (const sound of sounds) {
      // Only a new stamp can bring a skill a row names (the unstamped casts name none).
      if (sound.skills && !sound.skills.includes(state.skill)) continue;
      const due = mark - (LIMIT_ATTACK_TIME - sound.tick) * TICK_MS;
      if (due > now) this.#enqueue({ sound, owner, state, mark, clip, at, world, due });
      else if (answers(sound, state.skill, clip)) this.#play(sound.play, sound.channels, at);
    }
  }

  /** Plays the ticks that came due. Once a frame. */
  drain(now: number, world: number): void {
    const queue = this.#queue;
    while (queue.length > 0 && queue[0].due <= now) {
      const p = queue.shift()!;
      // A newer AttackTime restarted the count, this one ran out, the monster
      // left scope or the map changed.
      if (p.state.skillClearsAt !== p.mark || now >= p.mark) continue;
      if (p.owner.objOutOfScope || p.world !== world) continue;
      if (!answers(p.sound, p.state.skill, p.clip)) continue;
      this.#play(p.sound.play, p.sound.channels, p.at);
    }
  }

  #enqueue(p: Pending<P>): void {
    const queue = this.#queue;
    if (queue.length >= MAX_PENDING) return;
    let i = queue.length;
    while (i > 0 && queue[i - 1].due > p.due) i--;
    queue.splice(i, 0, p);
  }
}
