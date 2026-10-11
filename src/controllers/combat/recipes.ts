/**
 * Pure data shared by the combat entries: the per-skill cast clip table
 * (the `ExecuteSkill` / `UseSkillWarrior` / `SetRageSkillAni` switches of
 * the original, ZzzInterface.cpp:4803-6700, 2049-2200, MonkSystem.cpp:389),
 * the hit keys of the clips (the `AttackStage` / `AttackEffect` frame checks,
 * ZzzCharacter.cpp:2510-2960) and the clips a hit does not interrupt.
 * No state, no imports from entries. The per-skill rows are filled by
 * `registerSkills` from each skill's file.
 *
 * Skill numbers are OpenMU's, which are the original's `ActionSkillType`
 * (`_enum.h:300-480`); the strengthened / mastery variants share the base
 * skill's clip exactly as `g_SkillPairs` maps them back.
 */
import { PlayerAction } from '@versions/shared/objects/enum';
import { ENUM_WORLD } from '../../core/types';

// ---- per-skill cast clips --------------------------------------------------

export const A = PlayerAction;

/**
 * The clip a skill plays, and what it becomes on each mount. The original
 * repeats the same `c->Helper.Type` ladder verbatim at every call site
 * (`UseSkill*`, `AttackKnight` / `AttackWizard` / `AttackCommon`,
 * `ReceiveMagic`, `ReceiveMagicContinue`); the repeats are the `MOUNTED_*`
 * spreads below, so a row here reads as the one `case` it came from.
 *
 * A missing mount field means the original has no branch for it and the
 * ground clip plays - that is a fact about the original, not a gap.
 */
export type SkillClipSet = {
  /** On foot, and in a safe zone - every mount branch is written `&& !c->SafeZone`. */
  readonly ground: PlayerAction;
  readonly uniria?: PlayerAction;
  readonly dinorant?: PlayerAction;
  readonly horse?: PlayerAction;
  readonly fenrir?: PlayerAction;
};

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
export const SKILL_CLIPS: Readonly<Record<number, SkillClipSet | ClipPick>> = {};

/**
 * A skill that picks its clip itself rather than by mount: a coin toss (the Rage Fighter
 * party buffs) or the map (Fire Breath's rider). Gets the caster's `CastContext`.
 */
export type ClipPick = (ctx: { readonly world?: ENUM_WORLD }) => PlayerAction;

/**
 * The maps where a rider flies (`AT_SKILL_RIDER`'s flying clip, UseSkillWarrior:2250-2255,
 * WSclient.cpp:4424-4429): Tarkan and Kalima/Heaven. Fire Breath's file and the mount's
 * breath (petSystem) both read it.
 */
export const RIDER_FLY_WORLDS: ReadonlySet<number> = new Set([
  ENUM_WORLD.WD_8TARKAN,
  ENUM_WORLD.WD_10ICARUS, // the reference calls it WD_10HEAVEN
]);

/**
 * `SetPlayerMagic` (ZzzCharacter.cpp:1238-1262) - the generic cast clip, and
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
  [A.PLAYER_ATTACK_RIDE_STRIKE]: 3, // the same, mounted (ZzzCharacter.cpp:2868-2870)
  [A.PLAYER_FENRIR_ATTACK_DARKLORD_STRIKE]: 3, // the same, on a Fenrir
  [A.PLAYER_SKILL_FLASH]: 5.5, // Thunder Strike: AnimationFrame >= 5.5
  [A.PLAYER_ATTACK_ONETOONE]: 8, // Death Stab: CheckAttackTime(8) sword whoosh
  [A.PLAYER_SKILL_HELL_START]: 14, // Nova release: AnimationFrame >= 14
};

// ---- flinch immunity -------------------------------------------------------

/**
 * `SetPlayerShock` (ZzzCharacter.cpp:1283-1297): a player hit mid-clip does
 * NOT flinch while in one of these - the swing / cast finishes. Everything
 * else (including a plain attack swing) is interrupted by PLAYER_SHOCK.
 * Riders of Uniria / Dinorant / Dark Horse never flinch either (the mount
 * check lives with the consumer, which knows the pet slot). Each skill lists its clips in
 * `noFlinch`.
 */
export const SHOCK_IMMUNE_CLIPS: Set<PlayerAction> = new Set();
