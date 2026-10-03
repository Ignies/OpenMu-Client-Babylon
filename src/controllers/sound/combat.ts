import type { Item } from '../../ecs/world';
import { CharacterClassNumber } from '../../core/types';
import { getBaseClass, BaseClass } from '../../modules/hero/characterStats';
import { isFemaleClass } from '../actors/mapPlayerNetClassToModelClass';
import {
  GROUP_SPEAR,
  GROUP_SWORD,
  equippedBowType,
  isBow,
  isCrossbow,
  isWeaponItem,
} from '../actors/weaponClass';
import type { SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { playSfx, type SfxOptions, type SfxPosition } from './listener';
import { masterBase } from '../../modules/skills/skillAliases';
import { SoundsManager } from './soundsManager';

/**
 * Player combat and skill sounds, transcribed from the original client:
 * swing by weapon (ZzzCharacter.cpp:1219-1233), pain screams (:1420-1431),
 * death (:1477-1487), hit confirmation (:5183-5190), and skill casts keyed by
 * the wire skill number (`ExecuteSkill` / `AttackEffect`
 * ZzzCharacter.cpp:4280-5045, `ReceiveAttackSkill` WSclient.cpp:3880-4760).
 * Monster voices are their own entry (`monsters.ts`).
 *
 * Driven by: `CombatSfxSystem` (swing / pain / death), `app/logic.ts` and
 * `skillCastSystem` (skills, hits), through the selectors + `playCombat` /
 * `playSkill`. Command-only: no per-frame state.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Swings, hits, screams and casts are one category (`controllers/sound/buses.ts`). */
export const COMBAT_BUS: SoundBus = 'combat';

/** MODEL_LIGHT_SABER = MODEL_SWORD + 10, MODEL_SPEAR = spear group index 0 (_enum.h:1504, :1451). */
const LIGHT_SABER_INDEX = 10;
const LIGHT_SPEAR_INDEX = 0;

const MELEE_HITS = [
  'Sound/eMeleeHit1',
  'Sound/eMeleeHit2',
  'Sound/eMeleeHit3',
  'Sound/eMeleeHit4',
] as const;
const MISSILE_HITS = [
  'Sound/eMissileHit1',
  'Sound/eMissileHit2',
  'Sound/eMissileHit3',
  'Sound/eMissileHit4',
] as const;

const MALE_SCREAMS = [
  'Sound/pMaleScream1',
  'Sound/pMaleScream2',
  'Sound/pMaleScream3',
] as const;

/** Skill cast sounds by wire skill number, filled by `registerSkills` from each skill's `sound`. */
export const SKILL_SOUNDS: Readonly<Record<number, Sounds>> = {};

/** Skills whose caster hears nothing at the click (a skill's `silentHeroCast`, by exact number). */
export const SILENT_HERO_CASTS: Set<number> = new Set();

/** A cast sound that goes with the clip the cast played (a skill's `clipSound`, by exact number). */
export const SKILL_CLIP_SOUNDS: Record<number, (clip: number) => Sounds> = {};

/** The cast sound paired with `clip`, or null when the skill's sound does not depend on its clip. */
export function clipCastSound(skill: number, clip: number): Sounds | null {
  return SKILL_CLIP_SOUNDS[skill]?.(clip) ?? null;
}

/** Whether the skill's cast sound goes with its clip (so it plays once the clip is picked). */
export function hasClipSound(skill: number): boolean {
  return skill in SKILL_CLIP_SOUNDS;
}

/** The sound the hero's own cast plays as it starts. */
export function heroCastSound(skill: number): Sounds | null {
  return SILENT_HERO_CASTS.has(skill) ? null : skillSound(skill);
}

// ---- 2. selectors + commands -----------------------------------------------
// Pure selectors (which key) and the commands that play them. One-shots:
// nothing to hold between frames.

const rnd = (n: number) => Math.floor(Math.random() * n);

export type WeaponHands =
  | { leftHand: Item | null; rightHand: Item | null }
  | null
  | undefined;

/** SetPlayerAttack (ZzzCharacter.cpp:1219-1233): the swing sound at the clip's first frame. */
export function playerSwingSound(hands: WeaponHands): Sounds | null {
  const r = hands?.rightHand ?? null;
  const l = hands?.leftHand ?? null;

  const bowType = equippedBowType(hands ?? undefined);
  if (bowType === 'bow') return 'Sound/eBow';
  if (bowType === 'crossbow') return 'Sound/eCrossbow';
  // `c->Weapon[0]`, which is the appearance's left hand (ZzzCharacter.cpp:1310).
  if (
    l &&
    ((l.group === GROUP_SWORD && l.num === LIGHT_SABER_INDEX) ||
      (l.group === GROUP_SPEAR && l.num === LIGHT_SPEAR_INDEX))
  ) {
    return 'Sound/eSwingLightSword';
  }
  if (isWeaponItem(r) || isWeaponItem(l)) {
    return rnd(2) ? 'Sound/eSwingWeapon2' : 'Sound/eSwingWeapon1';
  }
  return null; // bare fists are silent
}

/** The hero's bow/crossbow hits use the missile-hit set (ZzzCharacter.cpp:5183). */
export function usesMissileWeapon(hands: WeaponHands): boolean {
  const r = hands?.rightHand ?? null;
  const l = hands?.leftHand ?? null;
  return isBow(r) || isBow(l) || isCrossbow(r) || isCrossbow(l);
}

/** SOUND_ATTACK_MELEE_HIT1 + rand % 4, or the missile set (+5) for archers. */
export function hitSound(missile: boolean): Sounds {
  return missile ? MISSILE_HITS[rnd(4)] : MELEE_HITS[rnd(4)];
}

/** SetPlayerShock (ZzzCharacter.cpp:1420-1431). */
export function playerPainSound(cls: CharacterClassNumber): Sounds {
  if (isFemaleClass(cls)) {
    return rnd(2) ? 'Sound/pFemaleScream2' : 'Sound/pFemaleScream1';
  }
  if (getBaseClass(cls) === BaseClass.DarkLord && rnd(5)) {
    return 'Sound/pDarkPain';
  }
  return MALE_SCREAMS[rnd(3)];
}

/** SetPlayerDie (ZzzCharacter.cpp:1477-1487). */
export function playerDeathSound(cls: CharacterClassNumber): Sounds {
  if (isFemaleClass(cls)) return 'Sound/pFemaleScream2';
  if (getBaseClass(cls) === BaseClass.DarkLord) return 'Sound/pDarkDeath';
  return 'Sound/pMaleDie';
}

/**
 * Skills whose sound plays when the effect lands, not at the cast (a skill's `soundOnLanding`, by
 * exact number): the skill row plays it (`playLandingSound`), so the cast is silent here.
 */
export const LANDING_SOUNDS: Set<number> = new Set();

export function skillSound(skill: number): Sounds | null {
  if (LANDING_SOUNDS.has(skill)) return null;
  return SKILL_SOUNDS[skill] ?? SKILL_SOUNDS[masterBase(skill)] ?? null;
}

/** The sound of a skill in `LANDING_SOUNDS`, played when its effect lands. */
export function playLandingSound(skill: number, at?: SfxPosition | null): void {
  if (LANDING_SOUNDS.has(skill)) playCombat(SKILL_SOUNDS[skill] ?? null, at);
}

/** Jewel pickups ring instead of clinking (WSclient.cpp:6181-6189). */
export function pickupSound(item: Item): 'jewel' | 'gemstone' | 'getItem' {
  if (item.group === 12) {
    // Jewel of Chaos 15, the bundled Bless 30 and Soul 31
    if ([15, 30, 31].includes(item.num)) return 'jewel';
  }
  if (item.group === 14) {
    // Bless 13, Soul 14, Life 16, Creation 22, Guardian 31
    if ([13, 14, 16, 22, 31].includes(item.num)) return 'jewel';
    if (item.num === 41) return 'gemstone'; // Gemstone
  }
  return 'getItem';
}

const COMBAT_OPTS: SfxOptions = { bus: COMBAT_BUS };
/**
 * Poison's SOUND_HEART is the low-life beat's one 1-channel buffer
 * (ZzzOpenData.cpp:4780), so a cast never stacks over it.
 */
const HEART_OPTS: SfxOptions = { bus: COMBAT_BUS, channels: 1 };

/** Play an already-selected combat sound at a position (swing, hit, scream). */
export function playCombat(key: Sounds | null, at?: SfxPosition | null): void {
  if (!key) return;
  playSfx(key, at, key === 'Sound/pHeartBeat' ? HEART_OPTS : COMBAT_OPTS);
}

/** `StopBuffer(key, true)`: cut a combat sound that is still playing (Nova's charge at its burst). */
export function stopCombat(key: Sounds): void {
  SoundsManager.stopAmbientLoop(key);
}

/** Play a skill's cast sound at its caster; silent for unlisted skills. */
export function playSkill(skill: number, at?: SfxPosition | null): void {
  playCombat(skillSound(skill), at);
}

// ---- 3. the layer ----------------------------------------------------------

export const combatLayer: SoundLayer = { name: 'combat' };
