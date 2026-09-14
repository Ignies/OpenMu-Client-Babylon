import monsters from '../common/monsters.json';
import items from '../common/items.json';

/**
 * What the Skins and Spawn tabs list, as searchable data.
 *
 * Built from the JSON tables the client ships and nothing else, so this can
 * be tested: which numbers the client can *draw* is a question for the model
 * tables, which reach for Babylon, and is passed in as a predicate.
 */

export type SkinKind = 'monster' | 'npc';

export type SkinEntry = {
  number: number;
  /** The English name from the table; the tab shows the language pack's. */
  name: string;
  level: number;
  kind: SkinKind;
};

export type MonsterRow = (typeof monsters)[number];

/**
 * A row with no attack type is something that stands in a town and talks;
 * the model tables know the rest by number.
 */
export function classifyRow(row: MonsterRow, npcNumbers: ReadonlySet<number>): SkinKind {
  if (npcNumbers.has(row.Numb)) return 'npc';
  return row.AttType === 0 ? 'npc' : 'monster';
}

export function buildSkinCatalogue(
  isKnown: (number: number) => boolean,
  npcNumbers: ReadonlySet<number>
): SkinEntry[] {
  return monsters
    .filter(row => isKnown(row.Numb))
    .map(row => ({
      number: row.Numb,
      name: row.Name,
      level: row.Level,
      kind: classifyRow(row, npcNumbers),
    }))
    .sort((a, b) => a.number - b.number);
}

/** The whole monster table, for spawning: the server accepts any number it defines. */
export function buildMonsterCatalogue(npcNumbers: ReadonlySet<number>): SkinEntry[] {
  return monsters
    .map(row => ({
      number: row.Numb,
      name: row.Name,
      level: row.Level,
      kind: classifyRow(row, npcNumbers),
    }))
    .sort((a, b) => a.number - b.number);
}

export function searchSkins(
  list: readonly SkinEntry[],
  query: string,
  kind: SkinKind | 'all',
  displayName: (entry: SkinEntry) => string = entry => entry.name
): SkinEntry[] {
  const needle = query.trim().toLowerCase();
  return list.filter(entry => {
    if (kind !== 'all' && entry.kind !== kind) return false;
    if (!needle) return true;
    return (
      String(entry.number) === needle ||
      entry.name.toLowerCase().includes(needle) ||
      displayName(entry).toLowerCase().includes(needle)
    );
  });
}

export type ItemEntry = {
  group: number;
  number: number;
  name: string;
  dropLevel: number;
  requiredLevel: number;
  width: number;
  height: number;
};

/** `ItemGroup` (itemAngle.ts), in table order. */
export const ITEM_GROUPS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export const ITEM_CATALOGUE: readonly ItemEntry[] = items
  .map(row => ({
    group: row.Group,
    number: row.Index,
    name: row.ItemName,
    dropLevel: row.ItemLvl ?? 0,
    requiredLevel: row.RequiredLvl ?? 0,
    width: row.X,
    height: row.Y,
  }))
  .sort((a, b) => a.group - b.group || a.number - b.number);

export function searchItems(
  query: string,
  group: number | null,
  displayName: (entry: ItemEntry) => string = entry => entry.name
): ItemEntry[] {
  const needle = query.trim().toLowerCase();
  const asNumber = /^\d+$/.test(needle) ? Number(needle) : null;
  return ITEM_CATALOGUE.filter(entry => {
    if (group !== null && entry.group !== group) return false;
    if (!needle) return true;
    if (asNumber !== null && entry.number === asNumber) return true;
    return entry.name.toLowerCase().includes(needle) || displayName(entry).toLowerCase().includes(needle);
  });
}

/** `/item`'s optional fields, as the tab collects them. */
export type ItemSpec = {
  level: number;
  /** Excellent option bits 0-5; 0 for none. */
  excellent: number;
  skill: boolean;
  luck: boolean;
  /** Option level 0-7. */
  option: number;
  /** Ancient set discriminator 0-2; 0 for none. */
  ancient: number;
};

export const DEFAULT_ITEM_SPEC: ItemSpec = {
  level: 0,
  excellent: 0,
  skill: false,
  luck: false,
  option: 0,
  ancient: 0,
};

/**
 * The values `/item group number lvl ex sk lu opt anc` is sent with. Every
 * slot is filled, defaults included: the server reads positionally, and a
 * blank in the middle would shift what follows into the wrong argument.
 */
export function itemCommandValues(entry: ItemEntry, spec: ItemSpec): Record<string, string> {
  const values: Record<string, string> = {
    group: String(entry.group),
    number: String(entry.number),
    lvl: String(spec.level),
    ex: String(spec.excellent),
    sk: spec.skill ? '1' : '0',
    lu: spec.luck ? '1' : '0',
    opt: String(spec.option),
    anc: String(spec.ancient),
  };
  return values;
}
