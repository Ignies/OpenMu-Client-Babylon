import type { Item } from '../ecs/world';
import items from '../common/items.json';
import { itemIconUrl } from '../common/itemIconPack';
import { categoryOf, type CategoryId } from './categories';

/**
 * Fixture listings for the UI pass. Nothing here survives the service: it
 * exists so the window can be looked at and judged before any bot or database
 * is built. Seeded so the catalogue is the same on every reload, which makes
 * screenshots comparable.
 */
export type Listing = {
  id: string;
  item: Item;
  category: CategoryId;
  seller: string;
  price: number;
  /** Epoch ms. */
  listedAt: number;
  /** What the same item has been selling for, for the "deal" sort. */
  median: number;
  mine?: boolean;
};

const SELLERS = [
  'Aurelia', 'Bloodmoon', 'Cassiel', 'Darkwynd', 'Ephemera', 'Faelan',
  'Grimwald', 'Halcyon', 'Ignitus', 'Jorvik', 'Kaelthas', 'Lumen',
  'Morrigan', 'Nyxaris', 'Oberon', 'Pyrrhus', 'Quintess', 'Ravenshade',
  'Sable', 'Thalric', 'Umbriel', 'Vesper', 'Wraithe', 'Xanthe',
];

/** mulberry32: small, seeded, and stable across reloads. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, list: readonly T[]): T =>
  list[Math.floor(r() * list.length)];

/** Round to something a player would actually type. */
function tidyPrice(zen: number): number {
  if (zen >= 100_000_000) return Math.round(zen / 10_000_000) * 10_000_000;
  if (zen >= 10_000_000) return Math.round(zen / 1_000_000) * 1_000_000;
  if (zen >= 1_000_000) return Math.round(zen / 100_000) * 100_000;
  if (zen >= 100_000) return Math.round(zen / 10_000) * 10_000;
  return Math.max(1000, Math.round(zen / 1000) * 1000);
}

/**
 * Price from what the item is, not at random: the base item level carries most
 * of it, then the upgrade level compounds, then excellent and ancient multiply.
 * The point is only that the catalogue sorts sensibly and the numbers look
 * plausible next to each other.
 */
function priceOf(item: Item, base: number, r: () => number): number {
  let zen = 20_000 + base * base * 900;
  if (item.lvl) zen *= 1 + item.lvl * 0.55;
  if (item.isExcellent) zen *= 4.5;
  if (item.isAncient) zen *= 7;
  if (item.luck) zen *= 1.3;
  if (item.optionLevel) zen *= 1 + item.optionLevel * 0.15;
  zen *= 0.75 + r() * 0.6;
  return tidyPrice(Math.min(zen, 2_000_000_000));
}

const LISTING_COUNT = 180;

export function buildMockListings(seed = 20260908): Listing[] {
  const r = rng(seed);
  // Items worth putting on a market: not Zen itself, not the "Sword / Spear /
  // Blade / Axe" style group placeholders, and nothing the icon pack has no
  // picture for - a card with an empty box tells us nothing about the layout.
  const sellable = items.filter(
    def =>
      def.ItemName &&
      !def.ItemName.includes('/') &&
      !(def.Group === 14 && def.Index === 15) &&
      itemIconUrl({ group: def.Group, num: def.Index }) !== null
  );

  // Drawn from a limited pool rather than the whole database, so the same item
  // is listed several times over - which is what a real market looks like, and
  // what the sell tab's price comparison needs to have anything to show.
  const pool = sellable
    .map(def => ({ def, order: r() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, 64)
    .map(entry => entry.def);

  const now = Date.now();
  const out: Listing[] = [];

  for (let i = 0; i < LISTING_COUNT; i++) {
    const def = pick(r, pool);
    const gear = def.Group <= 11 || (def.Group === 12 && def.Index <= 6);

    const item: Item = { group: def.Group, num: def.Index };
    if (gear) {
      const roll = r();
      item.lvl = roll > 0.82 ? 9 + Math.floor(r() * 4) : Math.floor(r() * 9);
      if (r() > 0.72) item.isExcellent = true;
      if (r() > 0.93) item.isAncient = true;
      if (r() > 0.7) item.luck = true;
      if (r() > 0.6) item.optionLevel = 1 + Math.floor(r() * 4);
      if (item.isExcellent) item.excellentFlags = 1 << Math.floor(r() * 6);
      item.durability = def.Durability ?? 20;
    }

    const price = priceOf(item, def.ItemLvl ?? 0, r);
    out.push({
      id: `L${(1000 + i).toString(36)}`,
      item,
      category: categoryOf(item),
      seller: pick(r, SELLERS),
      price,
      listedAt: now - Math.floor(r() * 1000 * 60 * 60 * 72),
      median: tidyPrice(price * (0.75 + r() * 0.7)),
    });
  }

  // A handful are the player's own, so My Listings has something in it.
  for (let i = 0; i < 4; i++) {
    const l = out[Math.floor(r() * out.length)];
    l.mine = true;
    l.seller = 'You';
  }

  return out;
}
