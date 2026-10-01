import type { Sounds } from '../sound/recipes';
import type { SkillClipSet } from '../combat/recipes';
import type { SkillLight } from '../lighting/skills';
import type { BuffArrival, BuffLook, SkillVisual } from './visuals';

/** One skill as its file declares it. Every field is optional except who it is. */
export interface SkillDef {
  readonly id: number;
  readonly name: string;
  /** What the skill draws on cast / travel / impact / area (fx controller). */
  readonly visual?: SkillVisual;
  /** The light it throws (lighting controller). */
  readonly light?: SkillLight;
  /** Cast sound (sound controller). */
  readonly sound?: Sounds;
  /** Cast animation, on foot and per mount (anim / combat controller). */
  readonly clip?: SkillClipSet;
  /** Re-use delay in ms. */
  readonly delayMs?: number;
  /** Persistent looks of the buffs this skill applies, by MagicEffect id. */
  readonly buffs?: Partial<Record<number, BuffLook>>;
  /** Work a buff does as it lands, by MagicEffect id. */
  readonly buffArrivals?: Partial<Record<number, BuffArrival>>;
}

export const defineSkill = (def: SkillDef): SkillDef => def;

/** Buff looks that belong to no skill (items, server effects). */
export const defineBuffLooks = (looks: Partial<Record<number, BuffLook>>) => looks;
