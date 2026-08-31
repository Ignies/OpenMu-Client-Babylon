import type { Item } from '../ecs/world';
import { CharacterClassNumber } from '../common/types';
import { getBaseClass, BaseClass } from '../common/characterStats';
import { isFemaleClass } from '../common/mapPlayerNetClassToModelClass';
import {
  GROUP_SPEAR,
  GROUP_SWORD,
  isBow,
  isCrossbow,
  isWeaponItem,
} from '../common/weaponClass';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { playSfx, type SfxPosition } from './listener';

/**
 * Player combat and skill sounds, transcribed from the original client:
 * swing by weapon (ZzzCharacter.cpp:1219-1233), pain screams (:1339-1349),
 * death (:1477-1487), hit confirmation (:5183-5190), and skill casts keyed by
 * the wire skill number (`ExecuteSkill` / `AttackEffect`
 * ZzzCharacter.cpp:4280-5045, `ReceiveAttackSkill` WSclient.cpp:3880-4760).
 * Monster voices are their own entry (`monsters.ts`).
 *
 * Driven by: `CombatSfxSystem` (swing / pain / death), `logic.ts` and
 * `skillCastSystem` (skills, hits), through the selectors + `playCombat` /
 * `playSkill`. Command-only: no per-frame state.
 */

// ---- 1. tuning -------------------------------------------------------------

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

/**
 * Skill cast sounds by wire skill number. Only skills whose sound the original
 * plays at cast time are listed; the rest stay silent until their effect
 * recipe  lands.
 */
export const SKILL_SOUNDS: Readonly<Record<number, Sounds>> = {
  1: 'Sound/pHeartBeat', // Poison (SOUND_HEART)
  2: 'Sound/eMeteorite', // Meteorite
  3: 'Sound/eThunder', // Lightning
  4: 'Sound/eMeteorite', // Fire Ball
  5: 'Sound/sFlame', // Flame
  6: 'Sound/w39/nightmare_tele', // Teleport
  7: 'Sound/sIce', // Ice
  8: 'Sound/sTornado', // Twister (AT_SKILL_STORM)
  9: 'Sound/sEvil', // Evil Spirit
  10: 'Sound/sHellFire', // Hellfire
  11: 'Sound/sMagic', // Power Wave
  12: 'Sound/sAquaFlash', // Aqua Beam (AT_SKILL_FLASH)
  15: 'Sound/eTelekinesis', // Teleport Ally
  16: 'Sound/eSoulBarrier', // Soul Barrier
  17: 'Sound/sMagic', // Energy Ball
  19: 'Sound/sKnightSkill1', // Falling Slash
  20: 'Sound/sKnightSkill2', // Lunge
  21: 'Sound/sKnightSkill3', // Uppercut
  22: 'Sound/sKnightSkill4', // Cyclone
  23: 'Sound/sKnightSkill4', // Slash
  38: 'Sound/eBlastPoison_1', // Decay
  39: 'Sound/eSuddenIce_1', // Ice Storm
  40: 'Sound/eHellFire2_2', // Nova
  41: 'Sound/sKnightSkill4', // Twisting Slash
  44: 'Sound/battlecastle/sCHaveyBlow', // Rush
  45: 'Sound/battlecastle/sCShockWave', // Javelin
  46: 'Sound/battlecastle/sCFireArrow', // Deep Impact
  48: 'Sound/eSwellLife', // Swell Life
  49: 'Sound/sKnightSkill3', // Rider (AT_SKILL_RIDER)
  52: 'Sound/ePiercing', // Penetration
  55: 'Sound/eBloodAttack', // Fire Slash
  56: 'Sound/sKnightSkill4', // Power Slash
  57: 'Sound/sKnightSkill2', // Spiral Slash
  58: 'Sound/eHellFire2_1', // Nova (charge)
  59: 'Sound/eCombo', // Combo
  60: 'Sound/sDarkSpear', // Force
  61: 'Sound/eFirebust', // Fire Burst
  62: 'Sound/sDarkEarthQuake', // Earthshake
  65: 'Sound/sDarkElecSpike', // Electric Spark
  66: 'Sound/sDarkSpear', // Force Wave
  76: 'Sound/pWskill', // Plasma Storm (Fenrir)
  77: 'Sound/infinityArrow', // Infinity Arrow
  78: 'Sound/Darklord_firescream', // Fire Scream
  214: 'Sound/SE_Ch_summoner_skill07_lifedrain', // Drain Life
  215: 'Sound/SE_Ch_summoner_skill08_chainlightning', // Chain Lightning
  216: 'Sound/SE_Ch_summoner_skill01_lightningof', // Lightning Orb
  217: 'Sound/SE_Ch_summoner_skill02_ssonze', // Thorns
  218: 'Sound/Berserker', // Berserker
  219: 'Sound/SE_Ch_summoner_skill03_sleep', // Sleep
  220: 'Sound/SE_Ch_summoner_skill04_blind', // Blind
  221: 'Sound/SE_Ch_summoner_weakness', // Weakness
  222: 'Sound/SE_Ch_summoner_innovation', // Innovation
  223: 'Sound/SE_Ch_summoner_skill05_explosion03', // Explosion
  224: 'Sound/SE_Ch_summoner_skill06_requiem02', // Requiem
  230: 'Sound/lightning_shock', // Lightning Shock
  233: 'Sound/SwellofMagicPower', // Expansion of Wizardry
  234: 'Sound/recover', // Recovery
  236: 'Sound/flame_strike', // Flame Strike
  237: 'Sound/gigantic_storm', // Gigantic Storm
  238: 'Sound/caotic', // Chaotic Diseier
  239: 'Sound/caotic', // Doppelganger self explosion
  260: 'Sound/Ragefighter/Rage_Thrust', // Killing Blow
  261: 'Sound/Ragefighter/Rage_Giantswing', // Beast Uppercut
  262: 'Sound/Ragefighter/Rage_Stamp', // Chain Drive
  263: 'Sound/Ragefighter/Rage_Darkside', // Dark Side
  264: 'Sound/Ragefighter/Rage_Dragonlower', // Dragon Roar
  265: 'Sound/Ragefighter/Rage_Dragonkick', // Dragon Slasher
  266: 'Sound/Ragefighter/Rage_Buff_1', // Increase Health (party)
  267: 'Sound/Ragefighter/Rage_Buff_2', // Increase Block
  268: 'Sound/Ragefighter/Rage_Buff_1', // Increase Defense
  269: 'Sound/battlecastle/sCHaveyBlow', // Occupy
};

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

  if (isBow(r) || isBow(l)) return 'Sound/eBow';
  if (isCrossbow(r) || isCrossbow(l)) return 'Sound/eCrossbow';
  if (
    r &&
    ((r.group === GROUP_SWORD && r.num === LIGHT_SABER_INDEX) ||
      (r.group === GROUP_SPEAR && r.num === LIGHT_SPEAR_INDEX))
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

/** SetPlayerShock (ZzzCharacter.cpp:1339-1349). */
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

export function skillSound(skill: number): Sounds | null {
  return SKILL_SOUNDS[skill] ?? null;
}

/** Jewel pickups ring instead of clinking (WSclient.cpp:5727-5734). */
export function pickupSound(item: Item): 'jewel' | 'gemstone' | 'getItem' {
  if (item.group === 12 && item.num === 15) return 'jewel'; // Jewel of Chaos
  if (item.group === 14) {
    // Bless 13, Soul 14, Life 16, Creation 22, Guardian 31
    if ([13, 14, 16, 22, 31].includes(item.num)) return 'jewel';
    if (item.num === 41) return 'gemstone'; // Gemstone
  }
  return 'getItem';
}

/** Play an already-selected combat sound at a position (swing, hit, scream). */
export function playCombat(key: Sounds | null, at?: SfxPosition | null): void {
  if (key) playSfx(key, at);
}

/** Play a skill's cast sound at its caster; silent for unlisted skills. */
export function playSkill(skill: number, at?: SfxPosition | null): void {
  playCombat(skillSound(skill), at);
}

// ---- 3. the layer ----------------------------------------------------------

export const combatLayer: SoundLayer = { name: 'combat' };
