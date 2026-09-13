import { GameOptions } from '../common/gameOptions';
import { HIGH_DROP_LEVEL } from '../common/dropTier';
import { isJewel, itemDef } from '../common/itemStats';
import type { Item } from '../ecs/world';
import { UI_SOUND_KEYS } from './ui';
import { pickupSound } from './combat';
import type { SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { playSfx, type SfxPosition } from './listener';

/**
 * The noise a drop makes landing: `CreateItem` / `CreateMoneyDrop`
 * (ZzzObject.cpp:5995-6002, :6198) - a jewel rings (SOUND_JEWEL01), a
 * Gemstone rings differently (SOUND_JEWEL02), zen jingles
 * (SOUND_DROP_GOLD01) and everything else thuds (SOUND_DROP_ITEM01).
 *
 * ...and, ours, which of those are worth hearing. On a busy hunting ground
 * the original's rule (every fresh drop sounds) is a continuous rattle of
 * 100-zen piles, so the rows can be narrowed to the drops the player is
 * actually there for. The vocabulary is the loot filter's
 * (`common/lootFilter.ts`): what is worth a name on the ground is what is
 * worth hearing land, and the two screens read as one idea.
 *
 * Driven by: `logic.ts` on `ItemsDropped` / `MoneyDroppedExtended` with
 * `IsFreshDrop` set. Command-only: no per-frame state.
 * Read by: nothing - it only plays.
 *
 * Picking an item up is not this: that is the player's own click and keeps
 * its interface chime (`ui.ts`) whatever the filter says.
 */

// ---- 1. tuning -------------------------------------------------------------

/** A drop landing is its own category (`sound/buses.ts`). */
const BUS: SoundBus = 'drops';

/** What `logic.ts` knows about a drop when the packet lands. */
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
