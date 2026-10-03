import type { MonsterAttackState } from '../anim/monsterAttackClip';
import { ServerPlayerActionType as S } from '@versions/shared/objects/enum';
import { REFERENCE_FPS } from '../anim/playSpeed';
import { monsterModelRegistry, monsterRegistry, type MonsterSound } from '../monsters';
import type { SoundBus } from './buses';
import type { SfxOptions } from './listener';
import type { Sounds } from './recipes';

/**
 * One-shots a server packet sets off that no looping entry owns: a trap
 * firing, a monster spawning, the cherry-blossom swirl, the Nightmare's
 * teleport and the Christmas-ring emotes.
 *
 * Driven by: `app/logic.ts`, from the packet handlers named on each row; it plays
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

const SKILL_TELEPORT = 6;

/** Rows from a type's own sounds (`MonsterDef.teleport`, `appearSound`, `summonSound`), one per type. */
const teleportRows = new Map<number, PacketSound>();
const appearRows = new Map<number, PacketSound>();
const summonRows = new Map<number, PacketSound>();

/** A type's row from its folder's sound, built once. */
function typeRow(rows: Map<number, PacketSound>, monster: number, sound: MonsterSound, bus: SoundBus): PacketSound {
  let out = rows.get(monster);
  if (!out) {
    out = row(sound.sound as Sounds, sound.channels, bus);
    rows.set(monster, out);
  }
  return out;
}

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
  const skill = monsterRegistry.def(monster)?.stormSkill;
  return skill !== undefined && state.skill === skill && now < state.skillClearsAt;
}

/**
 * A monster that arrives with the 0x8000 spawn bit: its folder's `appearSound` (AppearMonster,
 * WSclient.cpp:2837-2869), or its `summonSound` when it came by 0x1F (`summoned`: the Kalima gates,
 * WSclient.cpp:3117-3122). No type has both. A gate is a map door, so that one is on the world bus.
 */
export function appearSound(monster: number, summoned: boolean): PacketSound | undefined {
  const def = monsterRegistry.def(monster);
  if (summoned && def?.summonSound) return typeRow(summonRows, monster, def.summonSound, 'world');
  return def?.appearSound ? typeRow(appearRows, monster, def.appearSound, MONSTERS) : undefined;
}

/**
 * ReceiveMagic's AT_SKILL_TELEPORT (WSclient.cpp:4319-4330): a monster with its own teleport
 * (`MonsterDef.teleport`, the Nightmare) leaving on its map. It replaces CreateTeleportBegin, so
 * its SOUND_MAGIC does not play too.
 */
export function teleportCastSound(
  world: number,
  monster: number,
  skill: number
): PacketSound | undefined {
  if (skill !== SKILL_TELEPORT) return undefined;
  const tele = monsterRegistry.def(monster)?.teleport;
  if (!tele || tele.world !== world) return undefined;
  return typeRow(teleportRows, monster, tele, MONSTERS);
}

/**
 * A monster's 0x19 whose skill cast sound the original never plays: the type's or its body's
 * `quietCasts` (Energy Ball for the casters that end it silently, ZzzCharacter.cpp:5087-5137;
 * ReceiveMagic's eThunder for MODEL_QUEEN_BEE, WSclient.cpp:4279). `model` is the MONSTER_MODEL index.
 */
export function monsterCastQuiet(monster: number, model: number, skill: number): boolean {
  return (
    monsterRegistry.def(monster)?.quietCasts?.includes(skill) === true ||
    monsterModelRegistry.get(model)?.quietCasts?.includes(skill) === true
  );
}

/** ReceiveAction AT_SANTA1_* / AT_SANTA2_* (WSclient.cpp:3763-3783). */
export function santaActionSound(action: number): PacketSound | undefined {
  if (action >= S.Santa1_1 && action <= S.Santa1_3) return SANTA_JUMPS[action - S.Santa1_1];
  if (action >= S.Santa2_1 && action <= S.Santa2_3) return SANTA_TURN;
  return undefined;
}
