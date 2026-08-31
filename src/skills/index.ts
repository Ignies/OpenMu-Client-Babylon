import type { ENUM_WORLD } from '../common/types';
import type { SkillLayer } from './layer';
import { SKILL_LAYERS } from './layers';
import { activeBuffs, buffRemaining, hasBuff, type ActiveBuff } from './buffs';
import {
  skillCooldown,
  skillCooldownRemaining,
  startSkillCooldown,
  type SkillCooldown,
} from './cooldowns';
import {
  canUseSkill,
  skillRequirementsMet,
  skillUsability,
  type SkillUsability,
} from './usability';
import {
  inMasterProgression,
  masterExperience,
  masterExpPercent,
  masterLevel,
  masterLevelUpPoints,
} from './masterLevel';
import {
  ensureMasterTreeData,
  learnMasterSkill,
  masterCategoryPoints,
  masterLearnBlock,
  masterSkillInfo,
  masterSkillLevel,
  masterSkillOpen,
  masterSkillTooltipLines,
  masterTreeDataLoaded,
  masterTreeEntries,
  masterTreeText,
  type MasterLearnBlock,
  type MasterSkillInfo,
  type MasterTooltipLine,
  type MasterTreeEntry,
} from './masterTree';

export type { SkillLayer } from './layer';
export type { ActiveBuff } from './buffs';
export type { SkillCooldown } from './cooldowns';
export type { SkillBlock, SkillUsability } from './usability';
export type {
  MasterLearnBlock,
  MasterSkillInfo,
  MasterTooltipLine,
  MasterTreeEntry,
} from './masterTree';

/**
 * The skill layer: the client-side bookkeeping the server does not send —
 * buff timers, re-use delays, castability — behind one object. Copy `_template.ts` when adding to it.
 *
 * The game talks to `skills.update` once a frame (`ecs/systems/skillSystem`)
 * and `skills.reset` on a map change (`libs/mu/loadMapIntoScene`); both fan
 * out over `SKILL_LAYERS` (`layers.ts`), the only list of entries. The
 * readers and commands below are the facade's surface for the hotbar, the
 * buff bar, the tooltips and the cast system; every entry file stays
 * importable directly for a single consumer.
 */
class Skills {
  private readonly layers: SkillLayer[] = [...SKILL_LAYERS];

  /** Add an entry at runtime (tools, experiments). Returns the unregister. */
  register(layer: SkillLayer): () => void {
    this.layers.push(layer);
    return () => {
      const i = this.layers.indexOf(layer);
      if (i >= 0) this.layers.splice(i, 1);
    };
  }

  /** Every entry that exists on this map. */
  layersFor(map: ENUM_WORLD): SkillLayer[] {
    return this.layers.filter(l => !l.maps || l.maps.has(map));
  }

  /** Step every entry. Call once a frame, before anything reads the skills. */
  update(map: ENUM_WORLD, dt: number): void {
    for (const layer of this.layers) layer.update?.(map, dt);
  }

  /** Drop every entry's state. Call when the map changes. */
  reset(): void {
    for (const layer of this.layers) layer.reset?.();
  }

  // ---- readers -----------------------------------------------------------

  /** The hero's effects in the buff bar's order. */
  get activeBuffs(): ActiveBuff[] {
    return activeBuffs();
  }

  /** Whether the hero carries this effect. */
  hasBuff(effectId: number): boolean {
    return hasBuff(effectId);
  }

  /** Seconds the effect has left, or `null` when the client cannot know. */
  buffRemaining(effectId: number): number | null {
    return buffRemaining(effectId);
  }

  /** Seconds before the skill can be cast again, 0 when ready. */
  cooldownRemaining(num: number): number {
    return skillCooldownRemaining(num);
  }

  /** The running delay of a skill, or `null` when it is ready. */
  cooldown(num: number): SkillCooldown | null {
    return skillCooldown(num);
  }

  /** The full verdict: static requirements plus mana / AG / delay. */
  usability(num: number): SkillUsability {
    return skillUsability(num);
  }

  /** Class / level / energy / weapon pass: the icon is drawn in colour. */
  requirementsMet(num: number): boolean {
    return skillRequirementsMet(num);
  }

  /** Everything passes: the cast may go out. */
  canUse(num: number): boolean {
    return canUseSkill(num);
  }

  // ---- readers: master level / tree ---------------------------------------

  /** The hero is levelling as a master: bars and sheets show master values. */
  get inMasterProgression(): boolean {
    return inMasterProgression();
  }

  /** Master level, 0 without one. */
  get masterLevel(): number {
    return masterLevel();
  }

  /** Progress through the current master level, 0…1. */
  get masterExpPercent(): number {
    return masterExpPercent();
  }

  /** Total master experience and the next level's total. */
  get masterExperience(): { current: number; next: number } {
    return masterExperience();
  }

  /** Master points not yet spent in the tree. */
  get masterLevelUpPoints(): number {
    return masterLevelUpPoints();
  }

  /** Whether the tree tables are parsed (observable; see `loadMasterTree`). */
  get masterTreeLoaded(): boolean {
    return masterTreeDataLoaded();
  }

  /** The hero's tree nodes in index order. */
  get masterTree(): MasterTreeEntry[] {
    return masterTreeEntries();
  }

  /** Class name and the three category headings of the hero's tree. */
  masterTreeText(): { className: string; categories: readonly [string, string, string] } {
    return masterTreeText();
  }

  /** Levels spent per category column. */
  masterCategoryPoints(): number[] {
    return masterCategoryPoints();
  }

  /** Learned level / display values of a node. */
  masterSkillInfo(entry: MasterTreeEntry): MasterSkillInfo {
    return masterSkillInfo(entry);
  }

  /** Learned level of a master skill by number, 0 when none. */
  masterSkillLevel(num: number): number {
    return masterSkillLevel(num);
  }

  /** Every gate but the cost passes: the icon is drawn in colour. */
  masterSkillOpen(entry: MasterTreeEntry): boolean {
    return masterSkillOpen(entry);
  }

  /** Why a point cannot be spent on the node, `null` when it can. */
  masterLearnBlock(entry: MasterTreeEntry): MasterLearnBlock | null {
    return masterLearnBlock(entry);
  }

  /** The node's hover tip, coloured as the original draws it. */
  masterSkillTooltip(entry: MasterTreeEntry): MasterTooltipLine[] {
    return masterSkillTooltipLines(entry);
  }

  // ---- commands ----------------------------------------------------------

  /** Read the master tree tables once (the window calls it when it opens). */
  loadMasterTree(): Promise<void> {
    return ensureMasterTreeData();
  }

  /** Spend a master point: `AddMasterSkillPoint`. */
  learnMasterSkill(num: number): void {
    learnMasterSkill(num);
  }


  /**
   * Start the skill's re-use delay after a cast. `false` when it was still
   * cooling down (`CheckSkillDelay`), in which case nothing was started.
   */
  startCooldown(num: number): boolean {
    return startSkillCooldown(num);
  }
}

export const skills = new Skills();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
