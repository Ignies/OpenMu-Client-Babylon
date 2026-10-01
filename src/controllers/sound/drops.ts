import { GameOptions } from '../../features/options/gameOptions';
import { HIGH_DROP_LEVEL } from '../../features/drops/dropTier';
import { isJewel, itemDef } from '../../features/items/itemStats';
import type { Item } from '../../ecs/world';
import { UI_SOUND_KEYS } from './ui';
import { pickupSound } from './combat';
import type { SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { playSfx, type SfxPosition } from './listener';

/**
 * The noise a drop makes landing: `CreateItem` / `CreateMoneyDrop` (ZzzObject.cpp:5995-6002,
 * :6198), plus our filter of which drops are heard. Notes in readme.md.
 */

// ---- 1. tuning -------------------------------------------------------------

/** A drop landing is its own category (`controllers/sound/buses.ts`). */
const BUS: SoundBus = 'drops';

/** `INDEX_COMPILED_CELE` / `INDEX_COMPILED_SOUL`: 12/30 and 12/31. */
const BUNDLE_GROUP = 12;
const BUNDLED_JEWELS: readonly number[] = [30, 31];

/** What `app/logic.ts` knows about a drop when the packet lands. */
export type DropSoundInfo = {
  isMoney: boolean;
  /** Parsed item, absent for zen and for a row the serializer could not read. */
  item?: Item;
  /** `ITEM_GROUP_*` and the index inside it, as sent. */
  group: number;
  num: number;
};

// ---- 2. selectors + commands -----------------------------------------------

/** The key a drop lands with, whatever the filter then decides. */
export function dropSound(drop: DropSoundInfo): Sounds {
  if (drop.isMoney || !drop.item) return UI_SOUND_KEYS.dropMoney;
  // The bundles ring when picked up, not when they land (ZzzObject.cpp:6001).
  const { group, num } = drop.item;
  if (group === BUNDLE_GROUP && BUNDLED_JEWELS.includes(num)) {
    return UI_SOUND_KEYS.dropItem;
  }
  const kind = pickupSound(drop.item);
  return kind === 'getItem' ? UI_SOUND_KEYS.dropItem : UI_SOUND_KEYS[kind];
}

/**
 * Whether this drop is one the player asked to hear. Reads `GameOptions`, so
 * a box ticked in the Options window takes effect on the next drop.
 */
export function dropSoundAllowed(drop: DropSoundInfo): boolean {
  if (!GameOptions.dropSoundFilter) return true;

  if (drop.isMoney) return GameOptions.dropSoundZen;

  const item = drop.item;
  if (item) {
    if (GameOptions.dropSoundExcellent && item.isExcellent) return true;
    if (GameOptions.dropSoundAncient && item.isAncient) return true;
    if (GameOptions.dropSoundHighLevel && (item.lvl ?? 0) >= HIGH_DROP_LEVEL) {
      return true;
    }
  }

  if (GameOptions.dropSoundJewels) {
    const def = itemDef(drop.group, drop.num);
    if (def && isJewel(def)) return true;
  }

  return GameOptions.dropSoundOther;
}

/** A fresh drop landing at `at`, filter and slider applied. */
export function playDrop(drop: DropSoundInfo, at?: SfxPosition | null): void {
  if (!dropSoundAllowed(drop)) return;
  playSfx(dropSound(drop), at, { bus: BUS });
}

// ---- 3. the layer ----------------------------------------------------------

export const dropsLayer: SoundLayer = { name: 'drops' };
