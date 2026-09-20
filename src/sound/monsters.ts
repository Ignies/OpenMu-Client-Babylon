import type { SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { playSfx, type SfxPosition } from './listener';

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

/** The voice table's own category (`sound/buses.ts`). */
export const MONSTER_BUS: SoundBus = 'monsters';

/** MONSTER_ASSASSIN: flinches silently (ZzzCharacter.cpp:1328). */
export const MONSTER_ASSASSIN = 14;

/** Slot picked for each moment: `[0..1]` idle, `[2..3]` attack, `[4]` death. */
export type MonsterVoice = 'idle' | 'attack' | 'death';

/**
 * Monster sound table, generated from the original client
 * (ZzzOpenData.cpp OpenMonsterModel switch → SetMonsterSound, LoadWaveFile;
 * DSPlaySound.h ESound, SOUND_MONSTER = 210).
 * Key: monster model number (MONSTER_MODEL_x = MODEL_x - MODEL_MONSTER01).
 * Slots (ZzzCharacter.cpp): [0..1] idle / walk (random), [2..3] attack & hit
 * (2 + rand % 2), [4] death. Values are catalogue keys (`recipes.ts`), null = silent.
 * GENERATED - do not edit by hand, except the boss rows marked hand-ported
 * (their voices live outside the OpenMonsterModel switch).
 *
 * Only the 74 model types whose case actually calls `SetMonsterSound` carry
 * sounds; every other row is `SILENT`. The generator used to fill the gaps
 * with a placeholder - mGoblin* or mOrcCapAttack1 - which is where Raklion's
 * Ice Giants got their Noria goblin voices. What those monsters really say
 * is in `mapMonsters.ts`, keyed by the map they say it on.
 */
export type MonsterSoundSlots = readonly [
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
];

/**
 * `Models[type].Sounds[]` left at its -1 default: the model's
 * `OpenMonsterModel` case loads waves but never calls `SetMonsterSound`, so
 * the generic path says nothing for it. Everything added after Season 3 is in
 * this state; the ones that do speak are voiced per map, in `mapMonsters.ts`.
 */
const SILENT: MonsterSoundSlots = [null, null, null, null, null];

export const MONSTER_SOUNDS: Readonly<Record<number, MonsterSoundSlots>> = {
  // BULL_FIGHTER
  0: ['Sound/mBull1', 'Sound/mBull2', 'Sound/mBullAttack1', 'Sound/mBullAttack2', 'Sound/mBullDie'],
  // HOUND
  1: ['Sound/mHound1', 'Sound/mHound2', 'Sound/mHoundAttack1', 'Sound/mHoundAttack2', 'Sound/mHoundDie'],
  // BUDGE_DRAGON
  2: ['Sound/mBudge1', 'Sound/mBudgeAttack1', 'Sound/mBudgeAttack1', 'Sound/mBudgeAttack1', 'Sound/mBudgeDie'],
  // DARK_KNIGHT
  3: ['Sound/mDarkKnight1', 'Sound/mDarkKnight2', 'Sound/mDarkKnightAttack1', 'Sound/mDarkKnightAttack2', 'Sound/mDarkKnightDie'],
  // LICH
  4: ['Sound/mWizard1', 'Sound/mWizard2', 'Sound/mWizardAttack1', 'Sound/mWizardAttack2', 'Sound/mWizardDie'],
  // GIANT
  5: ['Sound/mGiant1', 'Sound/mGiant2', 'Sound/mGiantAttack1', 'Sound/mGiantAttack2', 'Sound/mGiantDie'],
  // LARVA
  6: ['Sound/mLarva1', 'Sound/mLarva2', 'Sound/mLarva1', 'Sound/mLarva2', 'Sound/mLarva2'],
  // GHOST
  7: ['Sound/mGhost1', 'Sound/mGhost2', 'Sound/mGhostAttack1', 'Sound/mGhostAttack2', 'Sound/mGhostDie'],
  // HELL_SPIDER
  8: ['Sound/mHellSpider1', 'Sound/mHellSpiderAttack1', 'Sound/mHellSpiderAttack1', 'Sound/mHellSpiderAttack1', 'Sound/mHellSpiderDie'],
  // SPIDER
  9: ['Sound/mSpider1', 'Sound/mSpider1', 'Sound/mSpider1', 'Sound/mSpider1', 'Sound/mSpider1'],
  // CYCLOPS
  10: ['Sound/mOgre1', 'Sound/mOgre2', 'Sound/mOgreAttack1', 'Sound/mOgreAttack2', 'Sound/mOgreDie'],
  // GORGON
  11: ['Sound/mGorgon1', 'Sound/mGorgon2', 'Sound/mGorgonAttack1', 'Sound/mGorgonAttack2', 'Sound/mGorgonDie'],
  // YETI
  12: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // ELITE_YETI
  13: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // ASSASSIN
  14: [null, null, 'Sound/mAssassinAttack1', 'Sound/mAssassinAttack2', 'Sound/mAssassinDie'],
  // ICE_MONSTER
  15: ['Sound/mIceMonster1', 'Sound/mIceMonster2', 'Sound/mIceMonster1', 'Sound/mIceMonster1', 'Sound/mIceMonsterDie'],
  // HOMMERD
  16: ['Sound/mHomord1', 'Sound/mHomord2', 'Sound/mHomordAttack1', 'Sound/mHomordAttack1', 'Sound/mHomordDie'],
  // WORM
  17: ['Sound/mWorm1', 'Sound/mWorm1', 'Sound/mWormDie', 'Sound/mWormDie', 'Sound/mWormDie'],
  // ICE_QUEEN
  18: ['Sound/mIceQueen1', 'Sound/mIceQueen2', 'Sound/mIceQueenAttack1', 'Sound/mIceQueenAttack2', 'Sound/mIceQueenDie'],
  // GOBLIN
  19: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // CHAIN_SCORPION
  20: ['Sound/mScorpion1', 'Sound/mScorpion2', 'Sound/mScorpionAttack1', 'Sound/mScorpionAttack2', 'Sound/mScorpionDie'],
  // BEETLE_MONSTER
  21: ['Sound/mBeetle1', 'Sound/mBeetle1', 'Sound/mBeetleAttack1', 'Sound/mBeetleAttack1', 'Sound/mBeetleDie'],
  // HUNTER
  22: ['Sound/mHunter1', 'Sound/mHunter2', 'Sound/mHunterAttack1', 'Sound/mHunterAttack2', 'Sound/mHunterDie'],
  // FOREST_MONSTER
  23: ['Sound/mWoodMon1', 'Sound/mWoodMon2', 'Sound/mWoodMonAttack1', 'Sound/mWoodMonAttack2', 'Sound/mWoodMonDie'],
  // AGON
  24: ['Sound/mArgon1', 'Sound/mArgon2', 'Sound/mArgonAttack1', 'Sound/mArgonAttack2', 'Sound/mArgonDie'],
  // STONE_GOLEM
  25: ['Sound/mGolem1', 'Sound/mGolem2', 'Sound/mGolemAttack1', 'Sound/mGolemAttack2', 'Sound/mGolemDie'],
  // DEVIL
  26: [null, null, 'Sound/mSatanAttack1', 'Sound/mSatanAttack1', null],
  // BALROG
  27: ['Sound/mBalrog1', 'Sound/mBalrog2', null, null, 'Sound/mBalrogDie'],
  // SHADOW
  28: ['Sound/mShadow1', 'Sound/mShadow2', 'Sound/mShadowAttack1', 'Sound/mShadowAttack1', 'Sound/mShadowDie'],
  // DEATH_KNIGHT
  29: ['Sound/mDarkKnight1', 'Sound/mDarkKnight2', 'Sound/mDarkKnightAttack1', 'Sound/mDarkKnightAttack2', 'Sound/mDarkKnightDie'],
  // DEATH_COW
  30: ['Sound/mBull1', 'Sound/mBull2', 'Sound/mBullAttack1', 'Sound/mBullAttack2', 'Sound/mBullDie'],
  // DRAGON
  31: [null, null, null, null, null],
  // BALI
  32: ['Sound/mBali1', 'Sound/mBali2', 'Sound/mBaliAttack1', 'Sound/mBaliAttack2', 'Sound/mBali2'],
  // BAHAMUT
  33: ['Sound/mBahamut1', 'Sound/mBahamut1', null, null, 'Sound/mBahamut1'],
  // VEPAR
  34: ['Sound/mBepar1', 'Sound/mBepar2', 'Sound/mGolemDie', 'Sound/mGolemDie', 'Sound/mBepar2'],
  // VALKYRIE
  35: ['Sound/mValkyrie1', 'Sound/mValkyrie1', null, null, 'Sound/mValkyrieDie'],
  // LIZARD
  36: ['Sound/mLizardKing1', 'Sound/mLizardKing2', 'Sound/mLizardKing1', 'Sound/mLizardKing2', null],
  // HYDRA
  37: ['Sound/mHydra1', 'Sound/mHydra1', 'Sound/mHydraAttack1', 'Sound/mHydraAttack1', 'Sound/mHydra1'],
  // TITAN
  39: ['Sound/mDarkKnight1', 'Sound/mDarkKnight2', 'Sound/mDarkKnightAttack1', 'Sound/mDarkKnightAttack2', 'Sound/mDarkKnightDie'],
  // SOLDIER
  40: ['Sound/mLizardKing1', 'Sound/mLizardKing2', 'Sound/mLizardKing1', 'Sound/mLizardKing2', null],
  // GOLDEN_WHEEL
  41: ['Sound/iron1', 'Sound/iron1', 'Sound/iron_attack1', 'Sound/iron_attack1', 'Sound/iron_attack1'],
  // TANTALLOS
  42: ['Sound/jaikan1', 'Sound/jaikan2', 'Sound/jaikan_attack1', 'Sound/jaikan_attack2', 'Sound/jaikan_die'],
  // BLOODY_WOLF
  43: ['Sound/blood1', 'Sound/blood1', 'Sound/blood_attack1', 'Sound/blood_attack2', 'Sound/blood_die'],
  // BEAM_KNIGHT
  44: ['Sound/death1', 'Sound/death1', 'Sound/death_attack1', 'Sound/death_attack1', 'Sound/death_die'],
  // MUTANT
  45: ['Sound/mutant1', 'Sound/mutant2', 'Sound/mutant_attack1', 'Sound/mutant_attack1', 'Sound/mutant_attack1'],
  // ORC_ARCHER
  46: [null, null, 'Sound/mOrcArcherAttack1', 'Sound/mOrcArcherAttack1', 'Sound/mBullDie'],
  // ORC
  47: ['Sound/mHunter2', 'Sound/mHunter2', 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', 'Sound/mBullDie'],
  // CURSED_KING
  48: ['Sound/mCursedKing1', 'Sound/mCursedKing2', null, null, 'Sound/mCursedKingDie1'],
  // MOLT
  49: ['Sound/mMolt1', 'Sound/mMolt1', 'Sound/mMoltAttack1', 'Sound/mMoltAttack1', 'Sound/mMoltDie'],
  // ALQUAMOS
  50: ['Sound/mAlquamosAttack1', 'Sound/mAlquamosAttack1', 'Sound/mAlquamosAttack1', 'Sound/mAlquamosAttack1', 'Sound/mAlquamosDie'],
  // QUEEN_RAINER
  51: ['Sound/mRainner1', null, 'Sound/mRainnerAttack1', 'Sound/mRainnerAttack1', 'Sound/mRainnerDie'],
  // CRUST
  52: ['Sound/mMegaCrust1', 'Sound/mMegaCrust1', 'Sound/mMegaCrustAttack1', 'Sound/mMegaCrustAttack1', 'Sound/mMegaCrustDie'],
  // PHANTOM_KNIGHT
  53: ['Sound/mPhantom1', 'Sound/mPhantom1', 'Sound/mPhantomAttack1', 'Sound/mPhantomAttack1', 'Sound/mPhantomDie'],
  // DRAKAN
  54: ['Sound/mDrakan1', 'Sound/mDrakan1', 'Sound/mDrakanAttack1', 'Sound/mDrakanAttack1', 'Sound/mDrakanDie'],
  // DARK_PHOENIX_SHIELD
  55: ['Sound/mPhoenix1', null, 'Sound/mPhoenixAttack1', 'Sound/mPhoenixAttack1', null],
  // DARK_PHOENIX
  56: SILENT,
  // RED_SKELETON_KNIGHT
  57: ['Sound/mRedSkull', null, 'Sound/mRedSkullAttack', null, 'Sound/mRedSkullDie'],
  // GIANT_OGRE
  58: [null, null, 'Sound/mBlackSkullAttack', null, 'Sound/mGhaintOrgerDie'],
  // DARK_SKULL_SOLDIER
  59: [null, null, 'Sound/mBlackSkullAttack', null, 'Sound/mBlackSkullDie'],
  // STATUE_OF_SAINT
  60: SILENT,
  // CASTLE_GATE
  61: SILENT,
  // MAGIC_SKELETON
  62: ['Sound/mMagicSkull', null, null, null, 'Sound/mMagicSkull'],
  // DEATH_ANGEL
  63: ['Sound/mDAngelIdle', 'Sound/mDAngelIdle', 'Sound/mDAngelAttack', 'Sound/mDAngelAttack', 'Sound/mDAngelDeath'],
  // ILLUSION_OF_KUNDUN - hand-ported: SetMonsterSound 232, 232, 233, 234, -1 (ZzzOpenData.cpp:3587-3592)
  64: ['Sound/mKundunIdle', 'Sound/mKundunIdle', 'Sound/mKundunAttack1', 'Sound/mKundunAttack2', null],
  // BLOOD_SOLDIER
  65: ['Sound/mBSoldierIdle1', 'Sound/mBSoldierIdle2', 'Sound/mBSoldierAttack1', 'Sound/mBSoldierAttack2', 'Sound/mBSoldierDeath'],
  // AEGIS
  66: ['Sound/mEsisIdle', 'Sound/mEsisIdle', 'Sound/mEsisAttack1', 'Sound/mEsisAttack2', 'Sound/mEsisDeath'],
  // DEATH_CENTURION
  67: ['Sound/mDsIdle1', 'Sound/mDsIdle2', 'Sound/mDsAttack1', 'Sound/mDsAttack2', 'Sound/mDsDeath'],
  // NECRON
  68: ['Sound/mNecronIdle1', 'Sound/mNecronIdle2', 'Sound/mNecronAttack1', 'Sound/mNecronAttack2', 'Sound/mNecronDeath'],
  // SHRIKER
  69: ['Sound/mSvIdle1', 'Sound/mSvIdle2', 'Sound/mSvAttack1', 'Sound/mSvAttack2', 'Sound/mSvDeath'],
  // CHAOSCASTLE_KNIGHT
  70: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // CHAOSCASTLE_ELF
  71: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // CHAOSCASTLE_WIZARD
  72: [null, null, 'Sound/mOrcArcherAttack1', 'Sound/mOrcArcherAttack1', null],
  // CASTLE_GATE1
  73: [null, null, null, null, null],
  // BATTLE_GUARD1
  76: [null, null, null, null, null],
  // BATTLE_GUARD2
  77: [null, null, null, null, null],
  // CANON_TOWER
  79: SILENT,
  // LIFE_STONE
  86: [null, null, null, null, null],
  // BALGASS - hand-ported: MapManager.cpp:224-230, played per action in GMCrywolf1st.cpp:1618-1652
  89: ['Sound/w35/balga_idle1', 'Sound/w35/balga_idle2', 'Sound/w35/balga_at1', 'Sound/w35/balga_at2', 'Sound/w35/balga_death'],
  // DARK_ELF_1
  92: SILENT,
  // SORAM
  94: SILENT,
  // BALLISTA
  99: SILENT,
  // WITCH_QUEEN
  100: SILENT,
  // GOLDEN_STONE_GOLEM
  101: SILENT,
  // DEATH_RIDER
  102: SILENT,
  // DEATH_TREE
  104: SILENT,
  // HELL_MAINE
  105: SILENT,
  // BERSERK
  106: SILENT,
  // SPLINTER_WOLF
  107: SILENT,
  // IRON_RIDER
  108: SILENT,
  // SATYROS
  109: SILENT,
  // BLADE_HUNTER
  110: SILENT,
  // KENTAUROS
  111: SILENT,
  // GIGANTIS
  112: SILENT,
  // GENOCIDER
  113: SILENT,
  // PERSONA
  114: SILENT,
  // TWIN_TAIL
  115: SILENT,
  // DREADFEAR
  116: SILENT,
  // MAYA_HAND_LEFT
  118: SILENT,
  // MAYA_HAND_RIGHT
  119: SILENT,
  // MAYA
  120: SILENT,
  // DARK_SKULL_SOLDIER_5
  121: SILENT,
  // POUCH_OF_BLESSING
  122: SILENT,
  // LUNAR_RABBIT
  127: SILENT,
  // RABBIT
  128: SILENT, // voiced in mapMonsters.ts
  // BUTTERFLY
  129: SILENT, // voiced in mapMonsters.ts
  // HIDEOUS_RABBIT
  130: SILENT, // voiced in mapMonsters.ts
  // WEREWOLF2
  131: SILENT, // voiced in mapMonsters.ts
  // CURSED_LICH
  132: SILENT, // voiced in mapMonsters.ts
  // TOTEM_GOLEM
  133: SILENT, // voiced in mapMonsters.ts
  // GRIZZLY
  134: SILENT, // voiced in mapMonsters.ts
  // CAPTAIN_GRIZZLY
  135: SILENT, // voiced in mapMonsters.ts
  // SAPIUNUS
  136: SILENT, // voiced in mapMonsters.ts
  // SAPIDUO
  137: SILENT, // voiced in mapMonsters.ts
  // SAPITRES
  138: SILENT, // voiced in mapMonsters.ts
  // SHADOW_PAWN
  139: SILENT, // voiced in mapMonsters.ts
  // SHADOW_KNIGHT
  140: SILENT, // voiced in mapMonsters.ts
  // SHADOW_LOOK
  141: SILENT, // voiced in mapMonsters.ts
  // NAPIN
  142: SILENT, // voiced in mapMonsters.ts
  // GHOST_NAPIN
  143: SILENT, // voiced in mapMonsters.ts
  // BLAZE_NAPIN
  144: SILENT, // voiced in mapMonsters.ts
  // ICE_WALKER
  145: SILENT, // voiced in mapMonsters.ts
  // GIANT_MAMMOTH
  146: SILENT, // voiced in mapMonsters.ts
  // ICE_GIANT
  147: SILENT, // voiced in mapMonsters.ts
  // COOLUTIN
  148: SILENT, // voiced in mapMonsters.ts
  // IRON_KNIGHT
  149: SILENT, // voiced in mapMonsters.ts
  // SELUPAN - hand-ported: ZzzOpenData.cpp:3767-3776 (word / rage / cure lines are event staged)
  150: SILENT, // voiced in mapMonsters.ts
  // SPIDER_EGGS_1
  151: SILENT,
  // SPIDER_EGGS_2
  152: SILENT,
  // SPIDER_EGGS_3
  153: SILENT,
  // FIRE_FLAME_GHOST
  154: SILENT,
  // CURSED_SANTA
  155: SILENT, // voiced in mapMonsters.ts
  // EVIL_GOBLIN
  156: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // ZOMBIE_FIGHTER
  157: SILENT, // voiced in mapMonsters.ts
  // GLADIATOR
  158: SILENT, // voiced in mapMonsters.ts
  // SLAUGTHERER
  159: SILENT, // voiced in mapMonsters.ts
  // BLOOD_ASSASSIN
  160: SILENT, // voiced in mapMonsters.ts
  // CRUEL_BLOOD_ASSASSIN
  161: SILENT, // voiced in mapMonsters.ts
  // LAVA_GIANT
  162: SILENT, // voiced in mapMonsters.ts
  // BURNING_LAVA_GIANT
  163: SILENT, // voiced in mapMonsters.ts
  // GAYION
  164: SILENT, // voiced in mapMonsters.ts
  // JERRY
  165: SILENT, // voiced in mapMonsters.ts
  // RAYMOND
  166: SILENT, // voiced in mapMonsters.ts
  // LUCAS
  167: SILENT, // voiced in mapMonsters.ts
  // FRED
  168: SILENT, // voiced in mapMonsters.ts
  // HAMMERIZE
  169: SILENT, // voiced in mapMonsters.ts
  // DUAL_BERSERKER
  170: SILENT, // voiced in mapMonsters.ts
  // DEVIL_LORD
  171: SILENT, // voiced in mapMonsters.ts
  // QUARTER_MASTER
  172: SILENT, // voiced in mapMonsters.ts
  // COMBAT_INSTRUCTOR
  173: SILENT, // voiced in mapMonsters.ts
  // ATICLES_HEAD
  174: SILENT, // voiced in mapMonsters.ts
  // DARK_GHOST
  175: SILENT, // voiced in mapMonsters.ts
  // BANSHEE
  176: SILENT, // voiced in mapMonsters.ts
  // HEAD_MOUNTER
  177: SILENT, // voiced in mapMonsters.ts
  // DEFENDER
  178: SILENT, // voiced in mapMonsters.ts
  // FORSAKER
  179: SILENT, // voiced in mapMonsters.ts
  // OCELOT
  180: SILENT,
  // ERIC
  181: SILENT,
  // MAD_BUTCHER
  189: SILENT, // voiced in mapMonsters.ts
  // TERRIBLE_BUTCHER
  190: SILENT, // voiced in mapMonsters.ts
  // DOPPELGANGER
  191: SILENT, // voiced in mapMonsters.ts
  // MEDUSA
  192: SILENT,
  // BLOODY_ORC
  193: SILENT,
  // BLOODY_DEATH_RIDER
  194: SILENT,
  // BLOODY_GOLEM
  195: SILENT,
  // BLOODY_WITCH_QUEEN
  196: SILENT,
  // BERSERKER_WARRIOR
  197: SILENT,
  // KENTAUROS_WARRIOR
  198: SILENT,
  // GIGANTIS_WARRIOR
  199: SILENT,
  // SOCCERBALL
  200: SILENT,
  // SAPI_QUEEN
  201: SILENT, // voiced in mapMonsters.ts
  // ICE_NAPIN
  202: SILENT, // voiced in mapMonsters.ts
  // SHADOW_MASTER
  203: SILENT, // voiced in mapMonsters.ts
  // DARK_MAMMOTH
  205: SILENT, // voiced in mapMonsters.ts
  // DARK_GIANT
  206: SILENT, // voiced in mapMonsters.ts
  // DARK_COOLUTIN
  207: SILENT, // voiced in mapMonsters.ts
  // DARK_IRON_KNIGHT
  208: SILENT, // voiced in mapMonsters.ts
  // VENOMOUS_CHAIN_SCORPION
  209: SILENT, // voiced in mapMonsters.ts
  // BONE_SCORPION
  210: SILENT, // voiced in mapMonsters.ts
  // ORCUS
  211: SILENT, // voiced in mapMonsters.ts
  // GOLLOCK
  212: SILENT, // voiced in mapMonsters.ts
  // CRYPTA
  213: SILENT, // voiced in mapMonsters.ts
  // CRYPOS
  214: SILENT, // voiced in mapMonsters.ts
  // CONDRA
  215: SILENT, // voiced in mapMonsters.ts
  // NACONDRA
  216: SILENT, // voiced in mapMonsters.ts
};


// ---- 2. selectors + commands -----------------------------------------------

const rnd = (n: number) => Math.floor(Math.random() * n);

export function monsterIdleSound(modelType: number): Sounds | null {
  const slots = MONSTER_SOUNDS[modelType];
  if (!slots || slots[0] === null) return null;
  return (slots[rnd(2)] ?? slots[0]) as Sounds;
}

export function monsterAttackSound(modelType: number): Sounds | null {
  const slots = MONSTER_SOUNDS[modelType];
  if (!slots || slots[2] === null) return null;
  return (slots[2 + rnd(2)] ?? slots[2]) as Sounds;
}

export function monsterDeathSound(modelType: number): Sounds | null {
  const slots = MONSTER_SOUNDS[modelType];
  return (slots?.[4] ?? null) as Sounds | null;
}

/** The voice for a moment, or null when that monster is silent there. */
export function monsterSound(
  modelType: number,
  voice: MonsterVoice
): Sounds | null {
  switch (voice) {
    case 'idle':
      return monsterIdleSound(modelType);
    case 'attack':
      return monsterAttackSound(modelType);
    case 'death':
      return monsterDeathSound(modelType);
  }
}

/** Play a monster's voice at its position; silent slots stay silent. */
export function playMonster(
  modelType: number,
  voice: MonsterVoice,
  at?: SfxPosition | null
): void {
  const key = monsterSound(modelType, voice);
  if (key) playSfx(key, at, { bus: MONSTER_BUS });
}

// ---- 3. the layer ----------------------------------------------------------

export const monstersLayer: SoundLayer = { name: 'monsters' };
