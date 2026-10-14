import type { ItemRecord } from '@/controllers/items';
import {
  SURFACE_CLOTH,
  SURFACE_GEAR,
  SURFACE_SKIN,
  modelKey,
  registerSurfaces,
  type Surface,
} from '@/controllers/render/surfaceClass';
import { ItemsDatabase } from '../items/itemsDatabase';

const WEAPONS_AND_SHIELDS = 6;
const LAST_ARMOUR_GROUP = 11;

/** A set only the robed classes wear (no DK, DL or RF) is cloth; the rest is gear. */
function itemSurface(item: ItemRecord): Surface | undefined {
  if (item.Group <= WEAPONS_AND_SHIELDS) return SURFACE_GEAR;
  if (item.Group > LAST_ARMOUR_GROUP) return undefined;

  return item['DK/BK'] || item.DL || item.RF ? SURFACE_GEAR : SURFACE_CLOTH;
}

/** The bare class bodies a character wears under no armour: `ArmorClass01`, `SkinClass106`, ... */
const CLASS_BODY = /^player\/(armor|helm|pant|glove|boot|skin)class/;

export function surfaceTable(items: readonly ItemRecord[]): Map<string, Surface> {
  const table = new Map<string, Surface>();

  for (const item of items) {
    const surface = itemSurface(item);
    if (surface !== undefined) table.set(modelKey(item.szModelFolder + item.szModelName), surface);
  }

  return table;
}

const table = surfaceTable(ItemsDatabase.all());

registerSurfaces(key => table.get(key) ?? (CLASS_BODY.test(key) ? SURFACE_SKIN : undefined));
