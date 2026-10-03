import type { PlayerAction } from '@versions/shared/objects/enum';
import type { Sounds } from '../sound/recipes';
import type { ClipPick, SkillClipSet } from '../combat/recipes';
import type { CastContext, PoseClip, SkillKill } from '../combat';
import type { SkillLight } from '../lighting/skills';
import type { CombatLayer } from '../combat/layer';
import type { CastTarget } from '../combat/castTargets';
import type { CombatHooks } from '../combat/skillHooks';
import type { BuffArrival, BuffHit, BuffLook, SkillVisual } from './visuals';

/** A mount as `CastContext` names it. */
export type Mount = NonNullable<CastContext['mount']>;

/** One skill as its file declares it. Every field is optional except who it is. */
export interface SkillDef {
  readonly id: number;
  readonly name: string;
  /** What the skill draws on cast / travel / impact / area (fx controller). */
  readonly visual?: SkillVisual;
  /** Master numbers with no row of their own that draw as this skill (look only). */
  readonly lookAliases?: readonly number[];
  /** Master numbers that cast, sound, light and draw as this skill (`masterBase`). */
  readonly masterAliases?: readonly number[];
  /** The light it throws (lighting controller). */
  readonly light?: SkillLight;
  /** Cast sound (sound controller). */
  readonly sound?: Sounds;
  /** The cast sound by the clip the cast played, in place of `sound` at the cast. */
  readonly clipSound?: (clip: PlayerAction) => Sounds;
  /** `sound` plays when the effect lands (the skill's visual calls `playLandingSound`), not at the cast. */
  readonly soundOnLanding?: true;
  /** The hero's own cast is silent at the click; the effect makes its sound later. */
  readonly silentHeroCast?: true;
  /** Cast animation, on foot and per mount, or a pick of its own (a coin toss, the map). */
  readonly clip?: SkillClipSet | ClipPick;
  /** A clip picked from the caster's hands and swing count, ahead of `clip`; null falls through. */
  readonly poseClip?: PoseClip;
  /** The skill swings a weapon clip of the attack rules instead ('highBow': SetPlayerHighBowAttack). */
  readonly swing?: 'highBow';
  /** Whether the cast advances `SwordCount`, where the clip rule alone would say otherwise. */
  readonly swordCount?: boolean;
  /** Cast with `SetPlayerMagic` though the skill table types it physical. */
  readonly castsAsSpell?: true;
  /** The clip everyone else plays in place of one of this skill's own. */
  readonly othersSee?: Partial<Record<PlayerAction, PlayerAction>>;
  /** Mounts on which the cast is dropped for everyone else and silent for the hero. */
  readonly quietOn?: readonly Mount[];
  /** This skill's clips that a hit does not interrupt (`SetPlayerShock`). */
  readonly noFlinch?: readonly PlayerAction[];
  /** This skill's clips that hold the caster's facing while they play (`bLookAtMouse = false`). */
  readonly holdsFacing?: readonly PlayerAction[];
  /** Re-use delay in ms. */
  readonly delayMs?: number;
  /** Who the cast is aimed at when its type alone would say otherwise. */
  readonly target?: CastTarget;
  /** Walk one square in toward the target: as the cast is sent, or mid clip. */
  readonly stepIn?: 'cast' | 'midClip';
  /** The client names the area cast's hits (0xDB) whatever the skill table's type says. */
  readonly explicitHits?: true;
  /** What a kill with this skill does to the body (DeathSystem). */
  readonly kill?: SkillKill;
  /** Skill-owned combat state: a layer the combat controller steps and the hooks its facade forwards to. */
  readonly combat?: { readonly layer?: CombatLayer; readonly hooks?: CombatHooks };
  /** UseSkillWarrior's cast glint on the blade: always, or only from a mount (Impale). */
  readonly warriorGlint?: true | 'mounted';
  /** The MagicEffect the skill applies; `MagicEffectCancelled` names the skill, not the effect. */
  readonly effect?: number;
  /**
   * Master numbers whose `MagicEffectCancelled` drops this `effect` too. Ours on purpose: the
   * original reads the skill as a BYTE (WSclient.cpp:3884), so its 256+ cases never match.
   */
  readonly effectAliases?: readonly number[];
  /** Persistent looks of the buffs this skill applies, by MagicEffect id. */
  readonly buffs?: Partial<Record<number, BuffLook>>;
  /** Work a buff does as it lands, by MagicEffect id. */
  readonly buffArrivals?: Partial<Record<number, BuffArrival>>;
  /** What a buff draws when its wearer, the hero, is hit, by MagicEffect id. */
  readonly buffHits?: Partial<Record<number, BuffHit>>;
}

export const defineSkill = (def: SkillDef): SkillDef => def;

/** Buff looks that belong to no skill (items, server effects). */
export const defineBuffLooks = (looks: Partial<Record<number, BuffLook>>) => looks;
