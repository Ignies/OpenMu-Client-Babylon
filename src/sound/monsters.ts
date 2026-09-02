import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { playSfx, type SfxPosition } from './listener';

/**
 * Monster voices: `Models[type].Sounds[0..4]`, filled by the original's
 * `OpenMonsterModel` switch (ZzzOpenData.cpp) and played from
 * ZzzCharacter.cpp — idle / walk `Sounds[rand % 2]` (:351, :712), attack and
 * flinch `Sounds[2 + rand % 2]` (:1202, :1329), death `Sounds[4]` (:1464).
 *
 * Driven by: `CombatSfxSystem` (the monster's clip changes) through the
 * selectors + `playMonster`. Command-only: no per-frame state.
 */

// ---- 1. data ---------------------------------------------------------------

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
 */
export type MonsterSoundSlots = readonly [
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
];

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
  56: ['Sound/mMagicSkull', null, null, null, 'Sound/mMagicSkull'],
  // RED_SKELETON_KNIGHT
  57: ['Sound/mRedSkull', null, 'Sound/mRedSkullAttack', null, 'Sound/mRedSkullDie'],
  // GIANT_OGRE
  58: [null, null, 'Sound/mBlackSkullAttack', null, 'Sound/mGhaintOrgerDie'],
  // DARK_SKULL_SOLDIER
  59: [null, null, 'Sound/mBlackSkullAttack', null, 'Sound/mBlackSkullDie'],
  // STATUE_OF_SAINT
  60: [null, null, 'Sound/mBlackSkullAttack', null, 'Sound/mBlackSkullDie'],
  // CASTLE_GATE
  61: [null, null, 'Sound/mBlackSkullAttack', null, 'Sound/mBlackSkullDie'],
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
  79: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // LIFE_STONE
  86: [null, null, null, null, null],
  // BALGASS - hand-ported: MapManager.cpp:224-230, played per action in GMCrywolf1st.cpp:1618-1652
  89: ['Sound/w35/balga_idle1', 'Sound/w35/balga_idle2', 'Sound/w35/balga_at1', 'Sound/w35/balga_at2', 'Sound/w35/balga_death'],
  // DARK_ELF_1
  92: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // SORAM
  94: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // BALLISTA
  99: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // WITCH_QUEEN
  100: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // GOLDEN_STONE_GOLEM
  101: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // DEATH_RIDER
  102: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // DEATH_TREE
  104: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // HELL_MAINE
  105: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // BERSERK
  106: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // SPLINTER_WOLF
  107: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // IRON_RIDER
  108: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // SATYROS
  109: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // BLADE_HUNTER
  110: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // KENTAUROS
  111: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // GIGANTIS
  112: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // GENOCIDER
  113: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // PERSONA
  114: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // TWIN_TAIL
  115: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // DREADFEAR
  116: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // MAYA_HAND_LEFT
  118: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // MAYA_HAND_RIGHT
  119: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // MAYA
  120: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // DARK_SKULL_SOLDIER_5
  121: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // POUCH_OF_BLESSING
  122: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // LUNAR_RABBIT
  127: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // RABBIT
  128: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // BUTTERFLY
  129: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // HIDEOUS_RABBIT
  130: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // WEREWOLF2
  131: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // CURSED_LICH
  132: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // TOTEM_GOLEM
  133: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // GRIZZLY
  134: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // CAPTAIN_GRIZZLY
  135: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // SAPIUNUS
  136: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // SAPIDUO
  137: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // SAPITRES
  138: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // SHADOW_PAWN
  139: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // SHADOW_KNIGHT
  140: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // SHADOW_LOOK
  141: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // NAPIN
  142: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // GHOST_NAPIN
  143: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // BLAZE_NAPIN
  144: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // ICE_WALKER
  145: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // GIANT_MAMMOTH
  146: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // ICE_GIANT
  147: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // COOLUTIN
  148: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // IRON_KNIGHT
  149: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // SELUPAN - hand-ported: ZzzOpenData.cpp:3767-3776 (word / rage / cure lines are event staged)
  150: [null, null, 'Sound/w58w59/Selupan_attack1', 'Sound/w58w59/Selupan_attack2', null],
  // SPIDER_EGGS_1
  151: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // SPIDER_EGGS_2
  152: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // SPIDER_EGGS_3
  153: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // FIRE_FLAME_GHOST
  154: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // CURSED_SANTA
  155: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // EVIL_GOBLIN
  156: ['Sound/mGoblin1', 'Sound/mGoblin2', 'Sound/mGoblinAttack1', 'Sound/mGoblinAttack2', 'Sound/mGoblinDie'],
  // ZOMBIE_FIGHTER
  157: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // GLADIATOR
  158: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // SLAUGTHERER
  159: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // BLOOD_ASSASSIN
  160: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // CRUEL_BLOOD_ASSASSIN
  161: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // LAVA_GIANT
  162: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // BURNING_LAVA_GIANT
  163: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // GAYION
  164: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // JERRY
  165: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // RAYMOND
  166: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // LUCAS
  167: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // FRED
  168: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // HAMMERIZE
  169: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // DUAL_BERSERKER
  170: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // DEVIL_LORD
  171: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // QUARTER_MASTER
  172: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // COMBAT_INSTRUCTOR
  173: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // ATICLES_HEAD
  174: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // DARK_GHOST
  175: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // BANSHEE
  176: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // HEAD_MOUNTER
  177: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // DEFENDER
  178: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // FORSAKER
  179: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // OCELOT
  180: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // ERIC
  181: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // MAD_BUTCHER
  189: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // TERRIBLE_BUTCHER
  190: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // DOPPELGANGER
  191: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // MEDUSA
  192: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // BLOODY_ORC
  193: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // BLOODY_DEATH_RIDER
  194: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // BLOODY_GOLEM
  195: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // BLOODY_WITCH_QUEEN
  196: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // BERSERKER_WARRIOR
  197: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // KENTAUROS_WARRIOR
  198: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // GIGANTIS_WARRIOR
  199: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // SOCCERBALL
  200: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // SAPI_QUEEN
  201: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // ICE_NAPIN
  202: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // SHADOW_MASTER
  203: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // DARK_MAMMOTH
  205: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // DARK_GIANT
  206: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // DARK_COOLUTIN
  207: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // DARK_IRON_KNIGHT
  208: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // VENOMOUS_CHAIN_SCORPION
  209: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // BONE_SCORPION
  210: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // ORCUS
  211: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // GOLLOCK
  212: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // CRYPTA
  213: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // CRYPOS
  214: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // CONDRA
  215: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
  // NACONDRA
  216: [null, null, 'Sound/mOrcCapAttack1', 'Sound/mOrcCapAttack1', null],
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
  if (key) playSfx(key, at);
}

// ---- 3. the layer ----------------------------------------------------------

export const monstersLayer: SoundLayer = { name: 'monsters' };
