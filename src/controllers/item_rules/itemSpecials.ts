import type { Item } from '../../ecs/world';
import { ItemGroup, isWing, type ItemDef } from './itemStats';
import { isOptionWing, wingOptionKind, wingOptions } from './wingOptions';

/** What the option level adds, by `SetItemAttributes`' `AT_*` kind (ZzzInfomation.cpp:1166-1444). */
export type OptionSpecial =
  | 'damage'
  | 'wizardry'
  | 'curse'
  | 'defenseRate'
  | 'defense'
  | 'life'
  | 'maxMana'
  | 'maxAg'
  | 'absorb'
  | 'agMax'
  | 'attackSpeed';

const BOLT = 7;
const ARROWS = 15;
const DINORANT = 3;
const DARK_HORSE = 4;
const RING_OF_ICE = 8;
const WIZARDS_RING = 20;
const RING_OF_MAGIC = 24;
const PENDANT_OF_ABILITY = 28;
const CAPE_OF_LORD = 30;

const isAmmo = (def: ItemDef) => def.group === ItemGroup.Bow && (def.index === BOLT || def.index === ARROWS);

/** The option level's specials (`Option3`), in the original's order. */
export function optionSpecials(item: Item, def: ItemDef): { kind: OptionSpecial; value: number }[] {
  const level = item.optionLevel ?? 0;
  if (!level) return [];
  const { group, index } = def;
  if (group === ItemGroup.Helper && index === DINORANT) {
    const out: { kind: OptionSpecial; value: number }[] = [];
    if (level & 0x01) out.push({ kind: 'absorb', value: 5 });
    if (level & 0x02) out.push({ kind: 'agMax', value: 50 });
    if (level & 0x04) out.push({ kind: 'attackSpeed', value: 5 });
    return out;
  }
  if (group <= ItemGroup.Bow) return isAmmo(def) ? [] : [{ kind: 'damage', value: level * 4 }];
  if (group === ItemGroup.Staff) return [{ kind: index >= 21 && index <= 29 ? 'curse' : 'wizardry', value: level * 4 }];
  if (group === ItemGroup.Shield) return [{ kind: 'defenseRate', value: level * 5 }];
  if (group <= ItemGroup.Boots) return [{ kind: 'defense', value: level * 4 }];
  if (group === ItemGroup.Helper && index >= RING_OF_ICE && index !== CAPE_OF_LORD) {
    const kind = index === RING_OF_MAGIC ? 'maxMana' : index === PENDANT_OF_ABILITY ? 'maxAg' : 'life';
    return [{ kind, value: level }];
  }
  if (!isOptionWing(group, index)) return [];
  const kind = wingOptionKind(item);
  return kind ? [{ kind, value: kind === 'life' ? level : level * 4 }] : [];
}

/** `CalcExcellentOptions`' two type ranges (ZzzInfomation.cpp:944-1030). */
function takesExcellent(def: ItemDef): boolean {
  const { group, index } = def;
  if (group <= ItemGroup.Boots) return true;
  if (group !== ItemGroup.Helper) return false;
  return index === 8 || index === 9 || (index >= 12 && index <= 13) || (index >= 21 && index <= 28);
}

/** `SpecialNum > 0` after `SetItemAttributes` (ZzzInfomation.cpp:1107-1452): any skill, luck, option or excellent line. */
export function hasSpecial(item: Item, def: ItemDef): boolean {
  if (wingOptions(item).length) return true;
  if (item.hasSkill && def.skill) return true;
  if (item.luck && ((def.group <= ItemGroup.Boots && !isAmmo(def)) || isWing(def))) return true;
  if (optionSpecials(item, def).length) return true;
  if ((item.excellentFlags ?? 0) & 0x3f && takesExcellent(def)) return true;
  if (def.group !== ItemGroup.Helper) return false;
  // The Dark Horse's pet line, the Wizard's Ring +0 / +3 and item 13/107 always carry one.
  return def.index === DARK_HORSE || def.index === 107 || (def.index === WIZARDS_RING && [0, 3].includes(item.lvl ?? 0));
}
