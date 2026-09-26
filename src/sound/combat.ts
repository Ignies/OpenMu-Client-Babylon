import type { Item } from '../ecs/world';
import { CharacterClassNumber } from '../common/types';
import { getBaseClass, BaseClass } from '../common/characterStats';
import { isFemaleClass } from '../common/mapPlayerNetClassToModelClass';
import {
  GROUP_SPEAR,
  GROUP_SWORD,
  equippedBowType,
  isBow,
  isCrossbow,
  isWeaponItem,
} from '../common/weaponClass';
import type { SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { playSfx, type SfxOptions, type SfxPosition } from './listener';
import { masterBase } from '../common/skillAliases';
import { SoundsManager } from '../libs/soundsManager';

/**
 * Player combat and skill sounds, transcribed from the original client:
 * swing by weapon (ZzzCharacter.cpp:1219-1233), pain screams (:1420-1431),
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

/** Swings, hits, screams and casts are one category (`sound/buses.ts`). */
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

/**
 * Skill cast sounds by wire skill number. Only skills whose sound the original
 * plays at cast time are listed; the rest stay silent until their effect
 * recipe  lands.
 */
export const SKILL_SOUNDS: Readonly<Record<number, Sounds>> = {
  // 1 Poison, 2 Meteorite, 4 Fire Ball, 7 Ice and their masters: none at the cast; the original plays them at the
  // release, 14 ticks after the packet (ZzzCharacter.cpp:4955-5034), and the rows do (common/skillVisuals.ts).
  // So do 11 Power Wave, 17 Energy Ball (sMagic) and 45 Lance (sCShockWave), ZzzCharacter.cpp:5011-5143.
  3: 'Sound/eThunder', // Lightning
  5: 'Sound/sFlame', // Flame
  6: 'Sound/sMagic', // Teleport (SOUND_MAGIC in CreateTeleportBegin)
  // 8 Twister (sTornado) and 12 Aqua Beam (sAquaFlash): none at the cast, the effect plays them at AttackTime 15
  // (ZzzCharacter.cpp:4496, :4553; common/skillVisuals.ts).
  9: 'Sound/sEvil', // Evil Spirit
  10: 'Sound/sHellFire', // Hellfire
  15: 'Sound/eTelekinesis', // Teleport Ally
  // 16 Soul Barrier and its masters: none at the cast; the buff's arrival and the impact play it (common/skillVisuals.ts).
  18: 'Sound/sKnightDefense', // Defense (SOUND_SKILL_DEFENSE, WSclient.cpp:3612)
  19: 'Sound/sKnightSkill1', // Falling Slash
  20: 'Sound/sKnightSkill2', // Lunge
  21: 'Sound/sKnightSkill3', // Uppercut
  22: 'Sound/sKnightSkill4', // Cyclone
  23: 'Sound/sKnightSkill4', // Slash
  // 38 Decay (eBlastPoison_1) and 39 Ice Storm (eSuddenIce_1): none at the cast, the effect plays them at AttackTime 15
  // (ZzzCharacter.cpp:4449, :4475; common/skillVisuals.ts).
  44: 'Sound/sKnightSkill2', // Rush (ReceiveMagic's SOUND_SKILL_SWORD2; the row plays sCHaveyBlow in Battle Castle)
  46: 'Sound/battlecastle/sCFireArrow', // Deep Impact
  52: 'Sound/ePiercing', // Penetration
  57: 'Sound/sKnightSkill2', // Spiral Slash
  58: 'Sound/eHellFire2_1', // Nova (charge)
  59: 'Sound/eCombo', // Combo
  60: 'Sound/sKnightSkill1', // Force (SOUND_SKILL_SWORD1 at the packet, WSclient.cpp:4333-4350; sDarkSpear plays at the strike)
  61: 'Sound/eFirebust', // Fire Burst
  62: 'Sound/sDarkEarthQuake', // Earthshake
  66: 'Sound/sKnightSkill1', // Force Wave
  74: 'Sound/eFirebust', // Space Split (SOUND_ATTACK_FIRE_BUST at the packet, WSclient.cpp:4532-4547)
  512: 'Sound/sDarkEarthQuake', // Earthshake Str
  516: 'Sound/sDarkEarthQuake', // Earthshake Mastery
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
  454: 'Sound/SE_Ch_summoner_skill03_sleep', // Sleep Strengthener
  459: 'Sound/SE_Ch_summoner_weakness', // Weakness Strengthener
  460: 'Sound/SE_Ch_summoner_innovation', // Innovation Strengthener
  461: 'Sound/SE_Ch_summoner_skill04_blind', // Blind (OpenMU's id for 220)
  463: 'Sound/SE_Ch_summoner_skill04_blind', // Blind Strengthener
  // The summons play their summoning sound at the cast; explosion03 and requiem02 come later with the effect (skillVisuals.ts).
  223: 'Sound/SE_Ch_summoner_skill05_explosion01', // Explosion (SOUND_SUMMON_SAHAMUTT)
  224: 'Sound/SE_Ch_summoner_skill06_requiem01', // Requiem (SOUND_SUMMON_NEIL)
  225: 'Sound/Rargle', // Pollution (SOUND_SUMMOM_RARGLE)
  230: 'Sound/lightning_shock', // Lightning Shock
  232: 'Sound/BLOW_OF_DESTRUCTION', // Strike of Destruction (ZzzCharacter.cpp:4179)
  455: 'Sound/SE_Ch_summoner_skill08_chainlightning', // Chain Lightning Strengthener
  456: 'Sound/lightning_shock', // Lightning Shock Strengthener
  458: 'Sound/SE_Ch_summoner_skill07_lifedrain', // Drain Life Strengthener
  462: 'Sound/SE_Ch_summoner_skill07_lifedrain', // Drain Life Mastery
  469: 'Sound/Berserker', // Berserker Strengthener
  470: 'Sound/Berserker', // Berserker Proficiency
  472: 'Sound/Berserker', // Berserker Mastery
  233: 'Sound/SwellofMagicPower', // Expansion of Wizardry
  380: 'Sound/SwellofMagicPower', // Expansion of Wizardry Str (WSclient.cpp:4950-4964)
  383: 'Sound/SwellofMagicPower', // Expansion of Wizardry Mastery
  234: 'Sound/recover', // Recovery
  236: 'Sound/flame_strike', // Flame Strike
  // 237 Gigantic Storm plays gigantic_storm from its row, at the clip key (ZzzCharacter.cpp:4777).
  238: 'Sound/caotic', // Chaotic Diseier
  260: 'Sound/Ragefighter/Rage_Thrust', // Killing Blow
  261: 'Sound/Ragefighter/Rage_Stamp', // Beast Uppercut (MonkSystem.cpp:1117)
  262: 'Sound/Ragefighter/Rage_Giantswing', // Chain Drive (MonkSystem.cpp:1125)
  263: 'Sound/Ragefighter/Rage_Darkside', // Dark Side
  264: 'Sound/Ragefighter/Rage_Dragonlower', // Dragon Roar
  265: 'Sound/Ragefighter/Rage_Dragonkick', // Dragon Slasher
  266: 'Sound/Ragefighter/Rage_Buff_1', // Increase Health (party)
  267: 'Sound/Ragefighter/Rage_Buff_2', // Increase Block
  268: 'Sound/Ragefighter/Rage_Buff_1', // Increase Defense
  269: 'Sound/battlecastle/sCHaveyBlow', // Occupy
  // Blade Master ranks play their base skill's sound: they share its case (WSclient.cpp:4368-4417,
  // ZzzCharacter.cpp:4190-4212, :4410-4419).
  326: 'Sound/sKnightSkill4', // Cyclone Str
  327: 'Sound/sKnightSkill4', // Slash Str
  328: 'Sound/sKnightSkill1', // Falling Slash Str
  329: 'Sound/sKnightSkill2', // Lunge Str
  330: 'Sound/sKnightSkill4', // Twisting Slash Str
  332: 'Sound/sKnightSkill4', // Twisting Slash Mastery
  337: 'Sound/BLOW_OF_DESTRUCTION', // Strike of Destruction Str
  340: 'Sound/BLOW_OF_DESTRUCTION', // Strike of Destruction Proficiency
  343: 'Sound/BLOW_OF_DESTRUCTION', // Strike of Destruction Mastery
  344: 'Sound/sKnightSkill4', // Blood Storm (no original: the Twisting Slash sound, with its clip)
  346: 'Sound/sKnightSkill4', // Blood Storm Strengthener
  356: 'Sound/eSwellLife', // Swell Life Str
  360: 'Sound/eSwellLife', // Swell Life Proficiency
  363: 'Sound/eSwellLife', // Swell Life Mastery
  495: 'Sound/sDarkEarthQuake', // Earth Prison: no source; the earthshake whose stone ring it borrows
  497: 'Sound/sDarkEarthQuake', // Earth Prison Strengthener
  // Master skills with the base skill's cast (SKILL_REPLACEMENTS, _enum.h:680-681).
  508: 'Sound/eFirebust', // Fire Burst Strengthener
  509: 'Sound/sKnightSkill1', // Force Wave Strengthener
  514: 'Sound/eFirebust', // Fire Burst Mastery
  518: 'Sound/Darklord_firescream', // Fire Scream Strengthener
  520: 'Sound/Darklord_firescream', // Fire Scream Mastery
};

/**
 * Skills whose caster hears nothing at the click: Fire Scream's cast (ClassAttack.cpp:866-901) and the
 * caster's own echo (WSclient.cpp:5180, `sc != Hero`) are silent; it screams when the effect spawns.
 */
const SILENT_HERO_CASTS: ReadonlySet<number> = new Set([78, 518, 520]);

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
 * Skills whose sound the original plays with the effect at AttackTime 15, 14 ticks after the
 * echo (ZzzCharacter.cpp:4724-4754, :5147-5156, :5213-5223), not at the cast: the skill row plays these
 * (`playLandingSound`, common/skillVisuals.ts), so the cast is silent here.
 */
const LANDING_SOUNDS: ReadonlySet<number> = new Set([214, 216, 221, 222, 458, 459, 460, 462]);

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
