/**
 * One item, as the original's item table (`Item.bmd`, OpenMU's item definitions) describes it.
 * Field names are the table's own, so every reader keeps working. See items/readme.md.
 */
export type ItemRecord = {
  Group: number;
  Index: number;
  ItemName: string;
  ItemSlot: number;
  Skill: number;
  X: number;
  Y: number;
  Serial: number;
  Drop: number;
  szModelFolder: string;
  szModelName: string;
  Option?: number;
  ItemLvl?: number;
  DmgMin?: number;
  DmgMax?: number;
  Speed?: number;
  Durability?: number;
  MagicDur?: number;
  MagicPwr?: number;
  RequiredLvl?: number;
  Strength?: number;
  Agi?: number;
  Ene?: number;
  Vit?: number;
  Command?: number;
  Type?: number;
  'DW/SM'?: number;
  'DK/BK'?: number;
  'Elf/ME'?: number;
  MG?: number;
  DL?: number;
  SUM?: number;
  RF?: number;
  Str?: number;
  Opt?: number;
  Def?: number;
  DefRate?: number;
  Dur?: number;
  ReqLvl?: number;
  Lvl?: number;
  Comm?: number;
  Zen?: number;
  Ice?: number;
  Poison?: number;
  Light?: number;
  Fire?: number;
  Earth?: number;
  Wind?: number;
  Water?: number;
  Valor?: number;
  Energy?: number;
};

/** An item file's default export: `export default defineItem({ Group: 0, Index: 0, ItemName: 'Kris', ... })`. */
export function defineItem(item: ItemRecord): ItemRecord {
  return item;
}
