import type { Item } from '@/ecs/world';
import { globalText, itemOptionTables, type MixRecipe, type MixSource } from '@/controllers/assets';
import { harmonyOf, hasGuardianOption, isOptionWing, itemStats, itemValue } from '@/controllers/item_rules';
import { t, type TextKey } from '@/i18n';

/**
 * `CMixRecipes` (MixMgr.cpp): which `Mix.bmd` recipe the items in the tray make, how likely it is to
 * succeed and what it costs, and how close the tray is to the recipe it looks most like. The refinery
 * and socket options ('G', 'H', 'I') are left out: only the goblin and the Chaos Card Master use this.
 */

/** `MAX_ITEM_INDEX`: an item code is `group * 512 + number`. */
const STRIDE = 512;
const code = (group: number, num: number) => group * STRIDE + num;

/** `_SPECIAL_ITEM_RECIPE_`. */
const SP = { excellent: 1, add380: 2, set: 4, harmony: 8, socket: 16 } as const;

const JEWELS = new Set([
  code(12, 15), // chaos
  code(12, 30), // packed bless
  code(12, 31), // packed soul
  code(14, 13), // bless
  code(14, 14), // soul
  code(14, 16), // life
  code(14, 22), // creation
  code(14, 31), // guardian
  code(14, 42), // harmony
]);
const FIRST_WINGS = new Set([code(12, 0), code(12, 1), code(12, 2), code(12, 41)]);
const SECOND_WINGS = new Set([code(12, 3), code(12, 4), code(12, 5), code(12, 6), code(13, 30), code(12, 42), code(12, 49)]);
const THIRD_WINGS = new Set([code(12, 36), code(12, 37), code(12, 38), code(12, 39), code(12, 40), code(12, 43), code(12, 50)]);
/** The items a mix counts by their stack (`m_bCanStack`). */
const STACKS = new Set([code(14, 3), code(14, 38), code(14, 39), code(14, 53), code(14, 88), code(14, 89), code(14, 90), code(14, 100)]);
const CHAOS_WEAPONS = new Set([code(2, 6), code(4, 6), code(5, 7)]);
const CHARM = code(14, 53);
const CHAOS_CHARM = code(14, 96);
const FENRIR = code(13, 37);
/** `EvaluateMixItemValue`: the jewels a mix values by a set number instead of their price. */
const MIX_VALUE: Readonly<Record<number, number>> = {
  [code(12, 15)]: 40000,
  [code(14, 13)]: 100000,
  [code(14, 14)]: 70000,
  [code(14, 22)]: 450000,
  [code(14, 16)]: 0,
};

/** `CMixItem`: one kind of item in the tray, its count summed over the stacks of it. */
export type MixItem = {
  type: number;
  level: number;
  option: number;
  durability: number;
  special: number;
  count: number;
  testCount: number;
  luck: boolean;
  equipment: boolean;
  canStack: boolean;
  wing: boolean;
  upgradedWing: boolean;
  thirdWing: boolean;
  value: number;
  charm: boolean;
  chaosCharm: boolean;
  jewel: boolean;
  guardianOption: boolean;
  fenrirOption: boolean;
};

/** The +N option as the `AT_IMPROVE_*` special the mix reads it from (ZzzInfomation.cpp:1185-1240). */
function optionValue(item: Item): number {
  const level = item.optionLevel ?? 0;
  if (!level) return 0;
  if (item.group <= 5) return item.group === 4 && (item.num === 7 || item.num === 15) ? 0 : level * 4;
  if (item.group === 6) return level * 5;
  if (item.group <= 11) return level * 4;
  if (item.group === 12) return isOptionWing(item.group, item.num) ? level * 4 : 0;
  return item.group === 13 && item.num >= 8 ? level * 4 : 0;
}

/** `CMixItem::SetItem` and `EvaluateMixItemValue` (MixMgr.cpp:52-232). */
export function toMixItem(item: Item): MixItem {
  const type = code(item.group, item.num);
  const wing = FIRST_WINGS.has(type);
  const upgradedWing = SECOND_WINGS.has(type);
  const thirdWing = THIRD_WINGS.has(type);
  let special = 0;
  if ((item.excellentFlags ?? 0) > 0 && !wing && !upgradedWing && !thirdWing) special |= SP.excellent;
  if ((itemStats(item)?.reqLvl ?? 0) >= 380) special |= SP.add380;
  if ((item.ancientDiscriminator ?? 0) > 0) special |= SP.set;
  // A socket item flips the 380 bit (`m_dwSpecialItem ^= RCP_SP_ADD380ITEM`).
  if ((item.socketCount ?? 0) > 0) special = (special | SP.socket) ^ SP.add380;
  if (harmonyOf(item)) special |= SP.harmony;
  const canStack = STACKS.has(type);
  const durability = item.durability ?? 0;
  return {
    type,
    level: item.lvl ?? 0,
    option: optionValue(item),
    durability,
    special,
    count: canStack ? durability : 1,
    testCount: 0,
    luck: !!item.luck && (item.group <= 11 || isOptionWing(item.group, item.num)),
    equipment: item.group <= 11,
    canStack,
    wing,
    upgradedWing,
    thirdWing,
    value: MIX_VALUE[type] ?? itemValue(item, 0),
    charm: type === CHARM,
    chaosCharm: type === CHAOS_CHARM,
    jewel: JEWELS.has(type),
    guardianOption: hasGuardianOption(item),
    fenrirOption: type === FENRIR && (item.excellentFlags ?? 0) !== 0,
  };
}

const sameItem = (a: MixItem, b: MixItem) =>
  a.type === b.type && a.level === b.level && (a.canStack || a.durability === b.durability) && a.option === b.option && a.special === b.special;

/** `CMixItemInventory::AddItem`: the tray's items, the same kind counted together. */
export function mixItemsOf(items: readonly (Item | null)[]): MixItem[] {
  const out: MixItem[] = [];
  for (const item of items) {
    if (!item) continue;
    const next = toMixItem(item);
    const held = out.find(other => sameItem(other, next));
    if (!held) {
      out.push(next);
      continue;
    }
    held.value += next.value;
    held.count += next.canStack ? next.durability : 1;
  }
  return out;
}

/** `CheckItem` (MixMgr.cpp:516-534). */
function fits(source: MixSource, item: MixItem): boolean {
  if (source.typeMin > item.type || source.typeMax < item.type) return false;
  if (source.levelMin > item.level || source.levelMax < item.level) return false;
  if (source.durabilityMin > item.durability || source.durabilityMax < item.durability) return false;
  if (source.optionMin > item.option || source.optionMax < item.option) return false;
  for (const bit of [SP.excellent, SP.add380, SP.set, SP.harmony, SP.socket]) {
    if ((source.special & bit) > (item.special & bit)) return false;
  }
  return true;
}

/** What is left over may only be a charm the recipe allows. */
const leftOverAllowed = (recipe: MixRecipe, items: MixItem[]) =>
  items.every(item => item.testCount <= 0 || (item.charm && recipe.charmOption === 'A') || (item.chaosCharm && recipe.chaosCharmOption === 'A'));

/** `CheckRecipeSub` (MixMgr.cpp:357-417): the first source item's level and code, or null. */
function matches(recipe: MixRecipe, items: MixItem[]): { level: number; type: number } | null {
  for (const item of items) item.testCount = item.count;
  const first = { level: 0, type: 0 };
  const taken = new Array<number>(recipe.sources.length).fill(0);
  let found = false;
  for (let j = 0; j < recipe.sources.length; j++) {
    const source = recipe.sources[j];
    if (source.countMin !== 0) found = false;
    for (const item of items) {
      if (!fits(source, item) || item.testCount <= 0 || source.countMax < taken[j] + item.testCount) continue;
      const take = Math.min(item.testCount, source.countMax);
      taken[j] += take;
      item.testCount -= take;
      found = true;
      if (j === 0) {
        first.level = item.level;
        first.type = item.type;
      }
    }
    if (!found || source.countMin > taken[j]) return null;
  }
  return leftOverAllowed(recipe, items) ? first : null;
}

/** `CheckRecipeSimilaritySub` (MixMgr.cpp:458-509): points, and how many of each source are still missing. */
function similarity(recipe: MixRecipe, items: MixItem[]): { points: number; missing: number[] } {
  const missing = recipe.sources.map(source => source.countMax);
  for (const item of items) item.testCount = item.count;
  let points = 0;
  recipe.sources.forEach((source, j) => {
    for (const item of items) {
      if (!fits(source, item) || item.testCount <= 0) continue;
      if (item.type === code(12, 15)) points += 1;
      else if (source.countMax < item.testCount) points += 1;
      else points += j === 0 ? 10 : j === 1 ? 5 : 3;
      if (missing[j] > 0) {
        missing[j] -= item.testCount;
        item.testCount -= source.countMax;
      }
    }
  });
  return { points: leftOverAllowed(recipe, items) ? points : 0, missing };
}

type Values = { total: number; excellent: number; equipment: number; wing: number; set: number; nonJewel: number; luck: boolean; firstLevel: number; maxRate: number };

/** `_MIXRATE_OPS`. */
const OP = { number: 0, add: 1, sub: 2, mul: 3, div: 4, lp: 5, rp: 6, int: 7, maxRate: 32, item: 33, wing: 34, excellent: 35, equip: 36, set: 37, level1: 38, nonJewel: 39, luck: 64 } as const;

/** `MixrateAddSub` / `MixrateMulDiv` / `MixrateFactor` (MixMgr.cpp:877-985): the rate formula. */
function evaluateRate(tokens: readonly { op: number; value: number }[], values: Values): number {
  let at = 0;
  const done = () => at >= tokens.length || tokens[at].op === OP.rp;
  const factor = (): number => {
    const token = tokens[at];
    let value = 0;
    if (token.op === OP.lp) {
      at++;
      value = addSub();
    } else if (token.op === OP.int) {
      at += 2;
      value = Math.trunc(addSub());
    } else if (token.op === OP.number) value = token.value;
    else if (token.op === OP.maxRate) value = values.maxRate;
    else if (token.op === OP.item) value = values.total;
    else if (token.op === OP.wing) value = values.wing;
    else if (token.op === OP.excellent) value = values.excellent;
    else if (token.op === OP.equip) value = values.equipment;
    else if (token.op === OP.set) value = values.set;
    else if (token.op === OP.luck) value = values.luck ? 25 : 0;
    else if (token.op === OP.level1) value = values.firstLevel;
    else if (token.op === OP.nonJewel) value = values.nonJewel;
    at++;
    return value;
  };
  const mulDiv = (): number => {
    let value = 0;
    while (!done()) {
      const op = tokens[at].op;
      if (op === OP.add || op === OP.sub) return value;
      if (op === OP.mul || op === OP.div) {
        at++;
        value = op === OP.mul ? value * factor() : value / factor();
      } else value = factor();
    }
    return value;
  };
  const addSub = (): number => {
    let value = 0;
    while (!done()) {
      const op = tokens[at].op;
      if (op === OP.add || op === OP.sub) {
        at++;
        value = op === OP.add ? value + mulDiv() : value - mulDiv();
      } else value = mulDiv();
    }
    return value;
  };
  // The C++ works in float.
  return Math.fround(addSub());
}

export type MixCheck = {
  /** The recipe the tray makes, or null. */
  recipe: MixRecipe | null;
  /** The recipe the tray looks most like, or null. */
  similar: MixRecipe | null;
  /** Per source of `similar`: how many are still missing (0 = there). */
  missing: number[];
  /** `m_bIsMixInit`: the tray is empty. */
  empty: boolean;
  successRate: number;
  requiredZen: number;
  /** The first source item's code (the 380 recipe names its options). */
  firstItemType: number;
  charmBonus: number;
  chaosCharms: number;
};

/** `CMixRecipeMgr::CheckMixInventory`: `CheckRecipe`, then `CheckRecipeSimilarity`. */
export function checkMix(recipes: readonly MixRecipe[], tray: readonly (Item | null)[]): MixCheck {
  const items = mixItemsOf(tray);
  const charmBonus = items.reduce((sum, item) => sum + (item.charm ? item.count : 0), 0);
  const chaosCharms = items.filter(item => item.chaosCharm).length;
  const check: MixCheck = { recipe: null, similar: null, missing: [], empty: items.length === 0, successRate: 0, requiredZen: 0, firstItemType: 0, charmBonus, chaosCharms };

  for (const recipe of recipes) {
    const first = matches(recipe, items);
    if (!first) continue;
    check.recipe = recipe;
    check.firstItemType = first.type;
    const values: Values = { total: 0, excellent: 0, equipment: 0, wing: 0, set: 0, nonJewel: 0, luck: false, firstLevel: first.level, maxRate: recipe.maxRate };
    for (const item of items) {
      if (item.luck) values.luck = true;
      if (item.special & SP.excellent) values.excellent += item.value;
      if (item.equipment) values.equipment += item.value;
      if (item.wing) values.wing += item.value;
      if (item.special & SP.set) values.set += item.value;
      if (!item.jewel) values.nonJewel += item.value;
      values.total += item.value;
    }
    let rate = Math.trunc(evaluateRate(recipe.rate, values));
    rate = Math.min(rate, recipe.maxRate);
    if (recipe.charmOption === 'A') rate += charmBonus;
    check.successRate = Math.min(rate, 100);
    check.requiredZen = recipe.zenType === 'A' || recipe.zenType === 'C' ? recipe.zen : recipe.zenType === 'B' ? check.successRate * recipe.zen : 0;
    break;
  }

  if (items.length === 0 && recipes.length === 1) {
    check.similar = recipes[0];
    check.missing = recipes[0].sources.map(() => recipes[0].sources[0].countMax);
    return check;
  }
  let best = 0;
  for (const recipe of recipes) {
    const sim = similarity(recipe, items);
    const points = sim.points === 1 && recipes.length > 1 ? 0 : sim.points;
    if (points > best || (points === best && points > 0 && check.recipe === recipe)) {
      best = points;
      check.similar = recipe;
      check.missing = sim.missing;
    }
  }
  return check;
}

/** `IsMixSource` (MixMgr.cpp:254-302): whether the machine takes the item at all. */
export function isMixSource(recipes: readonly MixRecipe[], item: Item, check: MixCheck): boolean {
  // The Lucky armour (indexes 62-72 of groups 7-11) goes to Jerridon only (`Check_LuckyItem`).
  if (item.group >= 7 && item.group <= 11 && item.num >= 62 && item.num <= 72) return false;
  const mix = toMixItem(item);
  const charmsAllowed = !check.recipe || check.recipe.charmOption === 'A';
  if (mix.charm && charmsAllowed && check.charmBonus + mix.count <= 10) return true;
  if (mix.chaosCharm && charmsAllowed && check.chaosCharms < 1) return true;
  for (const recipe of recipes) {
    if (check.charmBonus > 0 && recipe.charmOption !== 'A') continue;
    for (const source of recipe.sources) {
      if (!fits(source, mix)) continue;
      if (recipe.mixOption === 'B' && CHAOS_WEAPONS.has(mix.type)) continue;
      if (recipe.mixOption === 'C' && mix.guardianOption) continue;
      if (recipe.mixOption === 'D' && mix.fenrirOption) continue;
      if (recipe.mixOption === 'E' && !(mix.equipment || mix.wing || mix.upgradedWing || mix.thirdWing)) continue;
      return true;
    }
  }
  return false;
}

/** `GetSourceName`'s status (MixMgr.cpp:771-790): yellow when there, blue when partly, red when missing. */
export function sourceStatus(check: MixCheck, index: number): 'yes' | 'partly' | 'no' {
  const source = check.similar?.sources[index];
  if (!source) return 'no';
  if (check.empty) return source.countMin === 0 ? 'partly' : 'no';
  const missing = check.missing[index] ?? source.countMax;
  if (missing === 0) return 'yes';
  if (missing < source.countMax) return source.countMin <= 1 ? 'yes' : 'partly';
  return source.countMin === 0 ? 'partly' : 'no';
}

/** `GetItemAddOtioninfoText` (ItemAddOptioninfo.cpp:58-99) by option number. */
const ADD_OPTION_TEXT: Readonly<Record<number, TextKey>> = {
  1: 'item.opt380.attackRate',
  2: 'item.opt380.damage',
  3: 'item.opt380.defenseRate',
  4: 'item.opt380.defense',
  5: 'item.opt380.maxHp',
  6: 'item.opt380.maxSd',
  7: 'item.opt380.sdAuto',
  8: 'item.opt380.sdRate',
};

/**
 * `GetRecipeName` (MixMgr.cpp:582-635): the recipe's `GlobalText` words on one line, or for the 380
 * option recipe ('C') the two options the first item would get.
 */
export function recipeNameLines(recipe: MixRecipe, firstItemType: number, similar = false): string[] {
  if (recipe.mixOption === 'C') {
    const options = similar ? undefined : itemOptionTables()?.addOptions[firstItemType];
    const lines = (options ?? []).flatMap(([option, value]) => (ADD_OPTION_TEXT[option] ? [t(ADD_OPTION_TEXT[option], { value })] : []));
    return lines.length ? lines : [t('chaos.add380')];
  }
  const [first, second, third] = recipe.names;
  const ids = second === 0 ? [first] : third === 0 ? [first, second] : [first, second, third];
  return [ids.map(globalText).join(' ')];
}

/** `GetCurRecipeDesc` / `GetRecipeAdvice`: up to three `GlobalText` lines. */
export function recipeTextLines(ids: readonly number[]): string[] {
  return ids.filter(id => id > 0).map(globalText);
}
