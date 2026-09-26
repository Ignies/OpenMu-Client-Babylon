import type { MonsterAttackState } from '../common/monsterAttackClip';
import { ServerPlayerActionType as S } from '../common/objects/enum';
import { REFERENCE_FPS } from '../common/playSpeed';
import { ENUM_WORLD as W } from '../common/types';
import type { SoundBus } from './buses';
import type { SfxOptions } from './listener';
import type { Sounds } from './recipes';

/**
 * One-shots a server packet sets off that no looping entry owns: a trap
 * firing, a monster spawning, the cherry-blossom swirl, the Nightmare's
 * teleport and the Christmas-ring emotes.
 *
 * Driven by: `logic.ts`, from the packet handlers named on each row; it plays
 * `key` with `opts` through `playSfx`, at the object the original names.
 * Pure data and selectors: no state, nothing plays from here.
 *
 * A bare `PlayBuffer(sound)` (2D in the original) is still placed at its
 * object, as `mapMonsters.ts`'s `unranged` cues are: the listener plays it
 * whole within six tiles.
 */

// ---- 1. tuning -------------------------------------------------------------

export type PacketSound = {
  readonly key: Sounds;
  /** Built once per row, so a play allocates nothing. */
  readonly opts: SfxOptions;
};

const MONSTERS: SoundBus = 'monsters';

/** `channels` is the wave's `LoadWaveFile` count; MAX_CHANNEL (4) when it names none. */
function row(key: Sounds, channels: number, bus: SoundBus = 'world'): PacketSound {
  return { key, opts: { bus, channels } };
}

// ZzzOpenData.cpp:4760, :4808, :4814.
const TRAP_GRATE = row('Sound/aGrate', 1, MONSTERS);
const TRAP_FLAME = row('Sound/sFlame', 2, MONSTERS);
export const METEORITE_STORM = row('Sound/eMeteorite', 2, MONSTERS);

const MONSTER_METEORITE_TRAP = 103;
const SKILL_BOSS = 50;

// AppearMonster's rows; the monster sounds load with Channel = 2 (ZzzOpenData.cpp:3374), the
// Assassin with 1 (:4820).
const BULL_ATTACK = row('Sound/mBullAttack1', 2, MONSTERS);
const ORC_CAPTAIN_ATTACK = row('Sound/mOrcCapAttack1', 2, MONSTERS);
const APPEAR_SOUNDS: ReadonlyMap<number, PacketSound> = new Map([
  [44, BULL_ATTACK], // MONSTER_GOLDEN_DRAGON
  [21, row('Sound/mAssassin1', 1, MONSTERS)], // MONSTER_ASSASSIN
  // MONSTER_CHIEF_SKELETON_ARCHER_1..6 (the 7th, 139, is not listed).
  [85, ORC_CAPTAIN_ATTACK],
  [91, ORC_CAPTAIN_ATTACK],
  [97, ORC_CAPTAIN_ATTACK],
  [114, ORC_CAPTAIN_ATTACK],
  [120, ORC_CAPTAIN_ATTACK],
  [126, ORC_CAPTAIN_ATTACK],
]);

// The 0x1F caller's own row, after its AppearMonster call (WSclient.cpp:3117-3122); eWallFall
// loads with 1 channel (ZzzOpenData.cpp:4869). A gate is a map door, so the world bus.
const KALIMA_GATE_FALL = row('Sound/eWallFall', 1);
const KALIMA_GATE_FIRST = 152;
const KALIMA_GATE_LAST = 158;

// ZzzOpenData.cpp:4935-4936, no channel count.
export const SWIRL_START = row('Sound/cherryblossom/Eve_CherryBlossoms01', 4);
export const SWIRL_BLOOM = row('Sound/cherryblossom/Eve_CherryBlossoms02', 4);

/** MODEL_EFFECT_SKURA_ITEM's LifeTime (ZzzEffect.cpp:4666), one count per 25 fps frame. */
const SWIRL_LIFETIME = 52;
/** The LifeTimes its move re-blooms at (MoveHandlers.cpp:7476). */
const SWIRL_BLOOM_AT: readonly number[] = [30, 15, 4];

/**
 * Seconds after the swirl starts that Eve_CherryBlossoms02 replays. The original restarts it
 * every frame `(int)LifeTime` sits on a mark, which is one play at 25 fps.
 */
export const SWIRL_BLOOM_SECONDS: readonly number[] = SWIRL_BLOOM_AT.map(
  lifeTime => (SWIRL_LIFETIME - lifeTime) / REFERENCE_FPS
);

// MapManager.cpp:504.
const NIGHTMARE_TELE = row('Sound/w39/nightmare_tele', 1, MONSTERS);
const MONSTER_NIGHTMARE = 361;
const SKILL_TELEPORT = 6;

// The Energy Ball casters whose AttackTime end plays no SOUND_MAGIC (ZzzCharacter.cpp:5087-5122).
const SKILL_ENERGYBALL = 17;
const QUIET_ENERGY_BALL: ReadonlySet<number> = new Set([
  37, 46, 61, 66, 69, 70, 73, 75, 77, // Devil .. Dark Phoenix
  89, 95, 112, 118, 124, 130, 143, // Magic Skeleton 1-7
  87, 93, 99, 116, 122, 128, 141, // Giant Ogre 1-7
  163, 165, 167, 169, 171, 173, 427, // Chaos Castle 2 .. 14
  293, 303, // Poison Golem, Gigas Golem
]);
/** MODEL_YETI, MODEL_GRIZZLY, MODEL_SAPITRES throw their own missile, silently (:5124-5137). */
const QUIET_ENERGY_BALL_MODELS: ReadonlySet<number> = new Set([12, 134, 138]);
const SKILL_LIGHTNING = 3;
const MODEL_QUEEN_BEE = 83;

// SOUND_XMAS_JUMP_SANTA + i in enum order, then SOUND_XMAS_TURN (Event.cpp:150-153).
const SANTA_JUMPS: readonly PacketSound[] = [
  row('Sound/xmasjumpsanta', 1),
  row('Sound/xmasjumpsasum', 1),
  row('Sound/xmasjumpsnowman', 1),
];
const SANTA_TURN = row('Sound/xmasturn', 1);

// ---- 2. selectors ----------------------------------------------------------

/** SetPlayerAttack's trap branch (ZzzCharacter.cpp:1222-1235), by the world object the trap is. */
export function trapAttackSound(trapObject: number | undefined): PacketSound | undefined {
  if (trapObject === 39 || trapObject === 40) return TRAP_GRATE;
  if (trapObject === 51) return TRAP_FLAME;
  return undefined;
}

/**
 * AttackEffect's meteorite trap (ZzzCharacter.cpp:1993-1998) rains meteors and replays
 * SOUND_METEORITE01 every frame while `c->Skill == AT_SKILL_BOSS` and AttackTime runs.
 */
export function meteoriteStormRunning(
  monster: number,
  state: MonsterAttackState,
  now: number
): boolean {
  return (
    monster === MONSTER_METEORITE_TRAP && state.skill === SKILL_BOSS && now < state.skillClearsAt
  );
}

/**
 * A monster that arrives with the 0x8000 spawn bit: AppearMonster (WSclient.cpp:2837-2869), or a
 * Kalima gate when it came by 0x1F (`summoned`). The two sets of types do not overlap.
 */
export function appearSound(monster: number, summoned: boolean): PacketSound | undefined {
  if (summoned && monster >= KALIMA_GATE_FIRST && monster <= KALIMA_GATE_LAST) {
    return KALIMA_GATE_FALL;
  }
  return APPEAR_SOUNDS.get(monster);
}

/**
 * ReceiveMagic's AT_SKILL_TELEPORT (WSclient.cpp:4319-4330): the Nightmare leaving. It replaces
 * CreateTeleportBegin, so its SOUND_MAGIC does not play too.
 */
export function teleportCastSound(
  world: number,
  monster: number,
  skill: number
): PacketSound | undefined {
  return world === W.WD_39KANTURU_3RD && monster === MONSTER_NIGHTMARE && skill === SKILL_TELEPORT
    ? NIGHTMARE_TELE
    : undefined;
}

/**
 * A monster's 0x19 whose skill cast sound the original never plays: Energy Ball for the casters
 * above, and ReceiveMagic's eThunder for MODEL_QUEEN_BEE (WSclient.cpp:4279). `model` is the
 * MONSTER_MODEL index.
 */
export function monsterCastQuiet(monster: number, model: number, skill: number): boolean {
  if (skill === SKILL_ENERGYBALL) {
    return QUIET_ENERGY_BALL.has(monster) || QUIET_ENERGY_BALL_MODELS.has(model);
  }
  return skill === SKILL_LIGHTNING && model === MODEL_QUEEN_BEE;
}

/** ReceiveAction AT_SANTA1_* / AT_SANTA2_* (WSclient.cpp:3763-3783). */
export function santaActionSound(action: number): PacketSound | undefined {
  if (action >= S.Santa1_1 && action <= S.Santa1_3) return SANTA_JUMPS[action - S.Santa1_1];
  if (action >= S.Santa2_1 && action <= S.Santa2_3) return SANTA_TURN;
  return undefined;
}
