/**
 * Pure data shared by the combat entries: the per-skill cast clip table
 * (the `ExecuteSkill` / `UseSkillWarrior` / `SetRageSkillAni` switches of
 * the original, ZzzInterface.cpp:4803-6700, 2049-2200, MonkSystem.cpp:389),
 * the hit keys of the clips (the `AttackStage` / `AttackEffect` frame checks,
 * ZzzCharacter.cpp:2510-2960) and the skill numbers the entries key on.
 * No state, no imports from entries.
 *
 * Skill numbers are OpenMU's, which are the original's `ActionSkillType`
 * (`_enum.h:300-480`); the strengthened / mastery variants share the base
 * skill's clip exactly as `g_SkillPairs` maps them back.
 */
import { PlayerAction } from '../common/objects/enum';
import { ENUM_WORLD } from '../common/types';

// ---- skill numbers the entries key on --------------------------------------

/** AT_SKILL_NOVA: the release (charged) cast. */
export const SKILL_NOVA = 40;
/** AT_SKILL_NOVA_BEGIN: sent when the right button goes down; starts the charge. */
export const SKILL_NOVA_BEGIN = 58;
/** AT_SKILL_COMBO: the server announces a landed Dark Knight combo with this id. */
export const SKILL_COMBO = 59;
/** AT_SKILL_DARKSIDE: the one Rage Fighter skill that uses the 0x4A/0x4B pair. */
export const SKILL_DARK_SIDE = 263;
/** Rage Fighter party buffs (266..268) pick one of two clips at random. */
export const RAGE_BUFF_SKILLS: ReadonlySet<number> = new Set([266, 267, 268]);
/** AT_SKILL_RIDER: the one skill whose clip depends on the map, not the caster. */
export const SKILL_RIDER = 49;

// ---- per-skill cast clips --------------------------------------------------

const A = PlayerAction;

/**
 * The clip a skill plays, and what it becomes on each mount. The original
 * repeats the same `c->Helper.Type` ladder verbatim at every call site
 * (`UseSkill*`, `AttackKnight` / `AttackWizard` / `AttackCommon`,
 * `ReceiveMagic`, `ReceiveMagicContinue`); the repeats are the `MOUNTED_*`
 * spreads below, so a row here reads as the one `case` it came from.
 *
 * A missing mount field means the original has no branch for it and the
 * ground clip plays — that is a fact about the original, not a gap.
 */
export type SkillClipSet = {
  /** On foot, and in a safe zone — every mount branch is written `&& !c->SafeZone`. */
  readonly ground: PlayerAction;
  readonly uniria?: PlayerAction;
  readonly dinorant?: PlayerAction;
  readonly horse?: PlayerAction;
  readonly fenrir?: PlayerAction;
};

/**
 * Dark Lord strikes — Force, Force Wave, Fire Burst, Fire Scream, Space
 * Split, Chaotic Diseier. `Helper >= UNIRIA && <= DARK_HORSE` is one branch
 * (WSclient.cpp:3929-3945).
 */
const MOUNTED_STRIKE = {
  uniria: A.PLAYER_ATTACK_RIDE_STRIKE,
  dinorant: A.PLAYER_ATTACK_RIDE_STRIKE,
  horse: A.PLAYER_ATTACK_RIDE_STRIKE,
  fenrir: A.PLAYER_FENRIR_ATTACK_DARKLORD_STRIKE,
} as const;

/** Electric Spike (ZzzInterface.cpp:5635-5648). */
const MOUNTED_FLASH = {
  horse: A.PLAYER_ATTACK_RIDE_ATTACK_FLASH,
  fenrir: A.PLAYER_FENRIR_ATTACK_DARKLORD_FLASH,
} as const;

/** Party Teleport (WSclient.cpp:4388-4402). */
const MOUNTED_TELEPORT = {
  uniria: A.PLAYER_ATTACK_RIDE_TELEPORT,
  dinorant: A.PLAYER_ATTACK_RIDE_TELEPORT,
  horse: A.PLAYER_ATTACK_RIDE_TELEPORT,
  fenrir: A.PLAYER_FENRIR_ATTACK_DARKLORD_TELEPORT,
} as const;

/**
 * The castle-siege commands — Stun, Removal, Mana, Invisible, Removal Buff:
 * the four-way ladder `AttackCommon` runs (ZzzInterface.cpp:6495-6690,
 * WSclient.cpp:4170-4350).
 */
const MOUNTED_COMMAND = {
  horse: A.PLAYER_ATTACK_RIDE_ATTACK_MAGIC,
  uniria: A.PLAYER_SKILL_RIDER,
  dinorant: A.PLAYER_SKILL_RIDER_FLY,
  fenrir: A.PLAYER_FENRIR_ATTACK_MAGIC,
} as const;

/** Increase Critical Damage / Add Skill: horse and Fenrir only (WSclient.cpp:4369-4386). */
const MOUNTED_HAND = {
  horse: A.PLAYER_ATTACK_RIDE_ATTACK_MAGIC,
  fenrir: A.PLAYER_FENRIR_ATTACK_MAGIC,
} as const;

/** The Dark Knight default branch: only the Fenrir has a clip of its own. */
const MOUNTED_SWORD = { fenrir: A.PLAYER_FENRIR_ATTACK_MAGIC } as const;

/** The Summoner curses, which all share the Sleep clip and its three mounts. */
const MOUNTED_SLEEP = {
  uniria: A.PLAYER_SKILL_SLEEP_UNI,
  dinorant: A.PLAYER_SKILL_SLEEP_DINO,
  fenrir: A.PLAYER_SKILL_SLEEP_FENRIR,
} as const;

/** Drain Life, and its three mounts (ZzzInterface.cpp:2545-2560). */
const DRAIN_LIFE_CLIPS: SkillClipSet = {
  ground: A.PLAYER_SKILL_DRAIN_LIFE,
  uniria: A.PLAYER_SKILL_DRAIN_LIFE_UNI,
  dinorant: A.PLAYER_SKILL_DRAIN_LIFE_DINO,
  fenrir: A.PLAYER_SKILL_DRAIN_LIFE_FENRIR,
};

/** Chain Lightning, and its three mounts (:2592-2610). */
const CHAIN_LIGHTNING_CLIPS: SkillClipSet = {
  ground: A.PLAYER_SKILL_CHAIN_LIGHTNING,
  uniria: A.PLAYER_SKILL_CHAIN_LIGHTNING_UNI,
  dinorant: A.PLAYER_SKILL_CHAIN_LIGHTNING_DINO,
  fenrir: A.PLAYER_SKILL_CHAIN_LIGHTNING_FENRIR,
};

/** Sleep, Blind, Thorns, Berserker, Weakness, Enervation — one clip for all six. */
const SLEEP_CLIPS: SkillClipSet = { ground: A.PLAYER_SKILL_SLEEP, ...MOUNTED_SLEEP };

/**
 * Skill number → the clip the original plays, for the hero's own cast and
 * for everyone else in scope alike. Skills missing here fall back to
 * `chooseSkillAction`'s generic rule (`SetPlayerMagic` for a spell, the
 * weapon swing for a physical skill).
 *
 * Strengthened / mastery ids sit beside their base skill: the original
 * reaches them either by naming them in the same `case` list or through
 * `MasterSkillToBaseSkillIndex` (`g_SkillPairs`), and both land here.
 */
export const SKILL_CLIPS: Readonly<Record<number, SkillClipSet>> = {
  // --- Dark Knight (UseSkillWarrior, ZzzInterface.cpp:2221-2300) -----------
  // The default branch is PLAYER_ATTACK_SKILL_SWORD1 + baseSkill - FALLING_SLASH.
  19: { ground: A.PLAYER_ATTACK_SKILL_SWORD1, ...MOUNTED_SWORD }, // Falling Slash
  328: { ground: A.PLAYER_ATTACK_SKILL_SWORD1, ...MOUNTED_SWORD }, // Falling Slash Str
  20: { ground: A.PLAYER_ATTACK_SKILL_SWORD2, ...MOUNTED_SWORD }, // Lunge
  329: { ground: A.PLAYER_ATTACK_SKILL_SWORD2, ...MOUNTED_SWORD }, // Lunge Str
  21: { ground: A.PLAYER_ATTACK_SKILL_SWORD3, ...MOUNTED_SWORD }, // Uppercut
  22: { ground: A.PLAYER_ATTACK_SKILL_SWORD4, ...MOUNTED_SWORD }, // Cyclone
  326: { ground: A.PLAYER_ATTACK_SKILL_SWORD4, ...MOUNTED_SWORD }, // Cyclone Str
  479: { ground: A.PLAYER_ATTACK_SKILL_SWORD4, ...MOUNTED_SWORD }, // Cyclone Str (Duel Master)
  23: { ground: A.PLAYER_ATTACK_SKILL_SWORD5, ...MOUNTED_SWORD }, // Slash
  327: { ground: A.PLAYER_ATTACK_SKILL_SWORD5, ...MOUNTED_SWORD }, // Slash Str
  41: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Twisting Slash
  330: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Twisting Slash Str
  332: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Twisting Slash Mastery
  481: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Twisting Slash Str (Duel Master)
  55: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Fire Slash
  490: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Fire Slash Str
  42: { ground: A.PLAYER_ATTACK_SKILL_FURY_STRIKE }, // Rageful Blow
  331: { ground: A.PLAYER_ATTACK_SKILL_FURY_STRIKE }, // Rageful Blow Str
  333: { ground: A.PLAYER_ATTACK_SKILL_FURY_STRIKE }, // Rageful Blow Mastery
  43: { ground: A.PLAYER_ATTACK_ONETOONE }, // Death Stab
  336: { ground: A.PLAYER_ATTACK_ONETOONE }, // Death Stab Str
  47: { ground: A.PLAYER_ATTACK_SKILL_SPEAR, fenrir: A.PLAYER_FENRIR_ATTACK_SPEAR }, // Impale
  48: { ground: A.PLAYER_SKILL_VITALITY }, // Swell Life
  356: { ground: A.PLAYER_SKILL_VITALITY }, // Swell Life Str
  360: { ground: A.PLAYER_SKILL_VITALITY }, // Swell Life Proficiency
  44: { ground: A.PLAYER_ATTACK_RUSH }, // Rush
  232: { ground: A.PLAYER_SKILL_BLOW_OF_DESTRUCTION }, // Strike of Destruction
  337: { ground: A.PLAYER_SKILL_BLOW_OF_DESTRUCTION }, // Strike of Destruction Str
  56: { ground: A.PLAYER_ATTACK_TWO_HAND_SWORD_TWO, ...MOUNTED_SWORD }, // Power Slash (MG)
  482: { ground: A.PLAYER_ATTACK_TWO_HAND_SWORD_TWO, ...MOUNTED_SWORD }, // Power Slash Str
  57: { ground: A.PLAYER_ATTACK_ONE_FLASH }, // Spiral Slash (WSclient.cpp:4164)

  // --- Dark Wizard --------------------------------------------------------
  6: { ground: A.PLAYER_SKILL_TELEPORT }, // Teleport (SetPlayerTeleport, :6243)
  10: { ground: A.PLAYER_SKILL_HELL }, // Hell Fire
  388: { ground: A.PLAYER_SKILL_HELL }, // Hell Fire Str
  14: { ground: A.PLAYER_SKILL_INFERNO }, // Inferno
  381: { ground: A.PLAYER_SKILL_INFERNO }, // Inferno Str
  486: { ground: A.PLAYER_SKILL_INFERNO }, // Inferno Str (Duel Master)
  12: { ground: A.PLAYER_SKILL_FLASH }, // Flash (Mass Lightning)
  40: { ground: A.PLAYER_SKILL_HELL_START }, // Nova (release)
  58: { ground: A.PLAYER_SKILL_HELL_BEGIN }, // Nova (charge)
  73: { ground: A.PLAYER_ATTACK_DEATH_CANNON }, // Death Cannon (UseSkillWizard, :2457)
  233: { ground: A.PLAYER_SKILL_SWELL_OF_MP }, // Expansion of Wizardry (WSclient.cpp:4562)
  380: { ground: A.PLAYER_SKILL_SWELL_OF_MP }, // Expansion of Wizardry Str
  383: { ground: A.PLAYER_SKILL_SWELL_OF_MP }, // Expansion of Wizardry Mastery
  236: { ground: A.PLAYER_SKILL_FLAMESTRIKE }, // Flame Strike (MG)
  237: { ground: A.PLAYER_SKILL_GIGANTICSTORM }, // Gigantic Storm (MG)

  // --- Fairy Elf ----------------------------------------------------------
  // Infinity Arrow is the one skill that plays a *social* clip, and only on
  // foot — mounted it falls back to SetPlayerMagic (:4967-4975), which is
  // what an absent mount row means here.
  77: { ground: A.PLAYER_RUSH1 }, // Infinity Arrow
  441: { ground: A.PLAYER_RUSH1 }, // Infinity Arrow Str
  234: { ground: A.PLAYER_RECOVER_SKILL }, // Recovery (:4993-5000)

  // --- Dark Lord ----------------------------------------------------------
  60: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Force
  66: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Force Wave
  509: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Force Wave Str
  61: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Fire Burst
  508: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Fire Burst Str
  514: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Fire Burst Mastery
  74: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Space Split
  78: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Fire Scream
  518: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Fire Scream Str
  238: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Chaotic Diseier
  65: { ground: A.PLAYER_SKILL_FLASH, ...MOUNTED_FLASH }, // Electric Spike
  62: { ground: A.PLAYER_ATTACK_DARKHORSE }, // Earthshake
  512: { ground: A.PLAYER_ATTACK_DARKHORSE }, // Earthshake Str
  516: { ground: A.PLAYER_ATTACK_DARKHORSE }, // Earthshake Mastery
  63: { ground: A.PLAYER_ATTACK_TELEPORT, ...MOUNTED_TELEPORT }, // Party Teleport
  64: { ground: A.PLAYER_SKILL_HAND1, ...MOUNTED_HAND }, // Increase Critical Damage
  511: { ground: A.PLAYER_SKILL_HAND1, ...MOUNTED_HAND }, // Increase Critical Damage Str1
  515: { ground: A.PLAYER_SKILL_HAND1, ...MOUNTED_HAND }, // Increase Critical Damage Str2
  517: { ground: A.PLAYER_SKILL_HAND1, ...MOUNTED_HAND }, // Increase Critical Damage Str3
  75: { ground: A.PLAYER_SKILL_HAND1, ...MOUNTED_HAND }, // Add Skill (Brand of Skill)

  // --- Castle siege commands (AttackCommon, ZzzInterface.cpp:6442-6690) ----
  67: { ground: A.PLAYER_SKILL_VITALITY, ...MOUNTED_COMMAND }, // Stun
  68: { ground: A.PLAYER_ATTACK_REMOVAL, ...MOUNTED_COMMAND }, // Removal Stun
  69: { ground: A.PLAYER_SKILL_VITALITY, ...MOUNTED_COMMAND }, // Mana
  70: { ground: A.PLAYER_SKILL_VITALITY, ...MOUNTED_COMMAND }, // Invisible
  71: { ground: A.PLAYER_ATTACK_REMOVAL, ...MOUNTED_COMMAND }, // Removal Invisible
  72: { ground: A.PLAYER_SKILL_VITALITY, ...MOUNTED_COMMAND }, // Removal Buff

  // --- Summoner (UseSkillSummon, ZzzInterface.cpp:2534-2680) --------------
  214: DRAIN_LIFE_CLIPS, // Drain Life
  458: DRAIN_LIFE_CLIPS, // Drain Life Str
  215: CHAIN_LIGHTNING_CLIPS, // Chain Lightning
  455: CHAIN_LIGHTNING_CLIPS, // Chain Lightning Str
  216: {
    ground: A.PLAYER_SKILL_LIGHTNING_ORB,
    uniria: A.PLAYER_SKILL_LIGHTNING_ORB_UNI,
    dinorant: A.PLAYER_SKILL_LIGHTNING_ORB_DINO,
    fenrir: A.PLAYER_SKILL_LIGHTNING_ORB_FENRIR,
  }, // Lightning Orb
  219: SLEEP_CLIPS, // Sleep
  454: SLEEP_CLIPS, // Sleep Str
  220: SLEEP_CLIPS, // Blind
  217: SLEEP_CLIPS, // Thorns
  218: SLEEP_CLIPS, // Berserker
  469: SLEEP_CLIPS, // Berserker Str
  221: SLEEP_CLIPS, // Weakness
  222: SLEEP_CLIPS, // Enervation
  230: { ground: A.PLAYER_SKILL_LIGHTNING_SHOCK }, // Lightning Shock
  456: { ground: A.PLAYER_SKILL_LIGHTNING_SHOCK }, // Lightning Shock Str

  // --- Rage Fighter (CMonkSystem::SetRageSkillAni, MonkSystem.cpp:389) ----
  260: { ground: A.PLAYER_SKILL_THRUST }, // Killing Blow
  551: { ground: A.PLAYER_SKILL_THRUST }, // Killing Blow Str
  554: { ground: A.PLAYER_SKILL_THRUST }, // Killing Blow Mastery
  261: { ground: A.PLAYER_SKILL_STAMP }, // Beast Uppercut
  552: { ground: A.PLAYER_SKILL_STAMP }, // Beast Uppercut Str
  555: { ground: A.PLAYER_SKILL_STAMP }, // Beast Uppercut Mastery
  262: { ground: A.PLAYER_SKILL_GIANTSWING }, // Chain Drive
  558: { ground: A.PLAYER_SKILL_GIANTSWING }, // Chain Drive Str
  263: { ground: A.PLAYER_SKILL_DARKSIDE_READY }, // Dark Side
  559: { ground: A.PLAYER_SKILL_DARKSIDE_READY }, // Dark Side Str
  264: { ground: A.PLAYER_SKILL_DRAGONLORE }, // Dragon Roar
  560: { ground: A.PLAYER_SKILL_DRAGONLORE }, // Dragon Roar Str
  265: { ground: A.PLAYER_SKILL_DRAGONKICK }, // Dragon Slasher
  269: { ground: A.PLAYER_ATTACK_RUSH }, // Occupy (WSclient.cpp:4725)
};

/**
 * `AT_SKILL_RIDER` is the one skill whose clip is chosen by the *map*:
 * Tarkan, Kalima/Heaven and the Kanturu Maya scene get the flying variant
 * (UseSkillWarrior:2250-2255, WSclient.cpp:4424-4429). Kept out of
 * `SKILL_CLIPS` because it needs the world, not the caster.
 */
export const RIDER_FLY_WORLDS: ReadonlySet<number> = new Set([
  ENUM_WORLD.WD_8TARKAN,
  ENUM_WORLD.WD_10ICARUS, // the reference calls it WD_10HEAVEN
]);

export const RIDER_CLIPS = {
  ground: A.PLAYER_SKILL_RIDER,
  flying: A.PLAYER_SKILL_RIDER_FLY,
} as const;

/** The two clips a Rage Fighter party buff picks between, evens (:2866-2874). */
export const RAGE_BUFF_CLIPS: readonly PlayerAction[] = [
  A.PLAYER_SKILL_ATT_UP_OURFORCES,
  A.PLAYER_SKILL_HP_UP_OURFORCES,
];

/**
 * `SetPlayerMagic` (ZzzCharacter.cpp:1238-1262) — the generic cast clip, and
 * the one place the original tests `IsFemale` rather than the class: a
 * Summoner raises her hand with the same clip an Elf does. The Dark Horse has
 * no branch there, so a mounted Dark Lord casting a plain spell keeps the
 * hand clip.
 */
export const MAGIC_CLIPS = {
  female: A.PLAYER_SKILL_ELF1,
  male: [A.PLAYER_SKILL_HAND1, A.PLAYER_SKILL_HAND2] as const,
  uniria: A.PLAYER_RIDE_SKILL,
  dinorant: A.PLAYER_RIDE_SKILL,
  fenrir: A.PLAYER_FENRIR_ATTACK_MAGIC,
} as const;

// ---- hit keys --------------------------------------------------------------

/**
 * Animation key at which a clip's blow lands, in BMD keys (25 Hz reference
 * frames at PlaySpeed 1). `AttackStage` ends the basic swing when
 * `AnimationFrame >= 5` for every PLAYER_ATTACK_* clip; a handful of skill
 * clips check earlier or later. Anything not listed uses `DEFAULT_HIT_KEY`.
 */
export const DEFAULT_HIT_KEY = 5;

export const HIT_KEYS: Readonly<Partial<Record<PlayerAction, number>>> = {
  [A.PLAYER_ATTACK_SKILL_FURY_STRIKE]: 1, // Rageful Blow: AnimationFrame >= 1
  [A.PLAYER_ATTACK_STRIKE]: 3, // Force / Fire Burst: AnimationFrame >= 3
  [A.PLAYER_SKILL_FLASH]: 5.5, // Thunder Strike: AnimationFrame >= 5.5
  [A.PLAYER_ATTACK_ONETOONE]: 8, // Death Stab: CheckAttackTime(8) sword whoosh
  [A.PLAYER_SKILL_HELL_START]: 14, // Nova release: AnimationFrame >= 14
};

// ---- flinch immunity -------------------------------------------------------

/**
 * `SetPlayerShock` (ZzzCharacter.cpp:1283-1297): a player hit mid-clip does
 * NOT flinch while in one of these — the swing / cast finishes. Everything
 * else (including a plain attack swing) is interrupted by PLAYER_SHOCK.
 * Riders of Uniria / Dinorant / Dark Horse never flinch either (the mount
 * check lives with the consumer, which knows the pet slot).
 */
export const SHOCK_IMMUNE_CLIPS: ReadonlySet<PlayerAction> = new Set([
  A.PLAYER_ATTACK_SKILL_FURY_STRIKE, // Rageful Blow
  A.PLAYER_SKILL_VITALITY, // Swell Life
  A.PLAYER_SKILL_HELL_BEGIN, // Nova charge
  A.PLAYER_SKILL_ATT_UP_OURFORCES, // RF party buffs
  A.PLAYER_SKILL_HP_UP_OURFORCES,
  A.PLAYER_SKILL_GIANTSWING, // Chain Drive
  A.PLAYER_SKILL_DRAGONLORE, // Dragon Roar
]);
