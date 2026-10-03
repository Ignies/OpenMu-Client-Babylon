import type { SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { playSfx, type SfxPosition } from './listener';
import { monsterModelRegistry, monsterRegistry, type MonsterVoiceSlots } from '@/controllers/monsters';

/**
 * Monster voices: `Models[type].Sounds[0..4]`, filled by the original's
 * `OpenMonsterModel` switch (ZzzOpenData.cpp) and played from
 * ZzzCharacter.cpp - idle / walk `Sounds[rand % 2]` (:351, :712), attack and
 * flinch `Sounds[2 + rand % 2]` (:1202, :1329), death `Sounds[4]` (:1464).
 *
 * Driven by: `CombatSfxSystem` (the monster's clip changes) through the
 * selectors + `playMonster`. Command-only: no per-frame state.
 */

// ---- 1. data ---------------------------------------------------------------

/** The voice table's own category (`controllers/sound/buses.ts`). */
export const MONSTER_BUS: SoundBus = 'monsters';

/** MONSTER_ASSASSIN: flinches silently (ZzzCharacter.cpp:1328). */
export const MONSTER_ASSASSIN = 14;

/** Slot picked for each moment: `[0..1]` idle, `[2..3]` attack, `[4]` death. */
export type MonsterVoice = 'idle' | 'attack' | 'death';

/** A body's five voice slots: [0..1] idle / walk, [2..3] attack / hit, [4] death; null = silent. */
export type MonsterSoundSlots = MonsterVoiceSlots;

/**
 * A body's voices, from its file in versions/shared/monster_models (generated from ZzzOpenData.cpp
 * `OpenMonsterModel`, DSPlaySound.h SOUND_MONSTER = 210). Kalima's large Death Centurions and
 * Kundun's candidates are created with `SubType = 9` (GMHellas.cpp:813, :910) and play the next five
 * waves (ZzzCharacter.cpp:435): their monster folders say `subType: 9`, their body `subType9Voices`.
 */
export function monsterVoices(modelType: number, npcType?: number): MonsterSoundSlots | undefined {
  const body = monsterModelRegistry.get(modelType);
  if (npcType !== undefined && monsterRegistry.def(npcType)?.subType === 9) {
    return body?.subType9Voices ?? body?.voices;
  }
  return body?.voices;
}

// ---- 2. selectors + commands -----------------------------------------------

const rnd = (n: number) => Math.floor(Math.random() * n);

const slotsOf = monsterVoices;

// The original gates on the first slot of a pair and then rolls between the
// two; an empty second slot plays sound -1, which is never loaded, so that
// half of the roll is silent.
export function monsterIdleSound(modelType: number, npcType?: number): Sounds | null {
  const slots = slotsOf(modelType, npcType);
  if (!slots || slots[0] === null) return null;
  return slots[rnd(2)] as Sounds | null;
}

export function monsterAttackSound(modelType: number, npcType?: number): Sounds | null {
  const slots = slotsOf(modelType, npcType);
  if (!slots || slots[2] === null) return null;
  return slots[2 + rnd(2)] as Sounds | null;
}

export function monsterDeathSound(modelType: number, npcType?: number): Sounds | null {
  return (slotsOf(modelType, npcType)?.[4] ?? null) as Sounds | null;
}

/** The voice for a moment, or null when that monster is silent there. */
export function monsterSound(
  modelType: number,
  voice: MonsterVoice,
  npcType?: number
): Sounds | null {
  switch (voice) {
    case 'idle':
      return monsterIdleSound(modelType, npcType);
    case 'attack':
      return monsterAttackSound(modelType, npcType);
    case 'death':
      return monsterDeathSound(modelType, npcType);
  }
}

/** Play a monster's voice at its position; silent slots stay silent. */
export function playMonster(
  modelType: number,
  voice: MonsterVoice,
  at?: SfxPosition | null,
  npcType?: number
): void {
  const key = monsterSound(modelType, voice, npcType);
  if (key) playSfx(key, at, { bus: MONSTER_BUS });
}

// ---- 3. the layer ----------------------------------------------------------

export const monstersLayer: SoundLayer = { name: 'monsters' };
