import type { Item } from '../../ecs/world';
import { MAX_EXTRA_ITEM_CHARS } from './config';

/**
 * Extra item filters, the player's `helperItemFilters` (ours; the original matches the name only,
 * MuHelper.cpp `ShouldObtainItem`). `+` words, any order and case: +Luck, +Skill, +Exc, +Anc,
 * +Opt (any additional option) or +Opt 12 / +Opt12 (at least +12), +9 (at least level 9).
 */

/** How long an entry may be typed with the filters on; the blob keeps the first 14 characters. */
export const MAX_FILTERED_ITEM_CHARS = 40;

type ItemRule = {
  name: string;
  luck: boolean;
  skill: boolean;
  excellent: boolean;
  ancient: boolean;
  /** -1: no option asked; 0: any; else the least option value. */
  option: number;
  level: number;
};

function parseRule(entry: string): ItemRule {
  const rule: ItemRule = { name: '', luck: false, skill: false, excellent: false, ancient: false, option: -1, level: 0 };
  const name: string[] = [];
  const words = entry.trim().toLowerCase().split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const filter = word.startsWith('+') ? word.slice(1) : null;
    if (filter === 'luck') rule.luck = true;
    else if (filter === 'skill') rule.skill = true;
    else if (filter === 'exc' || filter === 'excellent') rule.excellent = true;
    else if (filter === 'anc' || filter === 'ancient') rule.ancient = true;
    else if (filter === 'opt') rule.option = /^\d+$/.test(words[i + 1] ?? '') ? Number(words[++i]) : 0;
    else if (filter && /^opt\d+$/.test(filter)) rule.option = Number(filter.slice(3));
    else if (filter && /^\d+$/.test(filter)) rule.level = Number(filter);
    else name.push(word);
  }

  rule.name = name.join(' ');
  return rule;
}

function ruleMatches(rule: ItemRule, name: string, item: Partial<Item> | undefined): boolean {
  if (!name.includes(rule.name)) return false;
  if ((rule.luck && !item?.luck) || (rule.skill && !item?.hasSkill)) return false;
  if ((rule.excellent && !item?.isExcellent) || (rule.ancient && !item?.isAncient)) return false;
  const option = (item?.optionLevel ?? 0) * 4;
  if (rule.option >= 0 && (option <= 0 || option < rule.option)) return false;
  return (item?.lvl ?? 0) >= rule.level;
}

/** Parsed once per list: the helper asks every 250 ms. */
let rulesFor: readonly string[] | null = null;
let rules: ItemRule[] = [];

/** Whether a drop named `name` is one of the `entries`, filters read. */
export function matchesFilteredItem(entries: readonly string[], name: string, item: Partial<Item> | undefined): boolean {
  if (entries !== rulesFor) {
    rules = entries.map(parseRule);
    rulesFor = entries;
  }
  const lower = name.toLowerCase();
  return rules.some(rule => ruleMatches(rule, lower, item));
}

/** The blob keeps 14 characters a slot: each slot gets back the whole entry it was cut from, once. */
export function restoreExtraItems(slots: readonly string[], full: readonly string[]): string[] {
  const left = [...full];
  return slots.map(slot => {
    const i = left.findIndex(entry => entry.slice(0, MAX_EXTRA_ITEM_CHARS) === slot);
    return i < 0 ? slot : left.splice(i, 1)[0];
  });
}
