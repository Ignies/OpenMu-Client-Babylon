import { reaction } from 'mobx';
import { t } from '../i18n';
import { Store } from '../store';
import { skills } from '../skills';
import { GameOptions } from './gameOptions';
import { Notices } from './notices';
import { InventoryConstants } from './inventoryConstants';
import { itemSquares, squareFits, stampSquares } from './inventoryLayout';
import { calcMaxDurability, itemDef } from './itemStats';
import { findHotkeyItem } from './itemHotkeys';
import type { Item } from '../ecs/world';

/**
 * The four things a player finds out too late: gear about to break, a full
 * grid, the last potion drunk, a buff running out.
 *
 * All four are already in the store - this only watches them and puts a
 * line on the notice banner the server messages use, once per crossing, so
 * a hovering value cannot spam. Behind `GameOptions.stateWarnings`.
 */

/** Durability crossings that are worth a line, high to low. */
const DURABILITY_STEPS = [30, 10] as const;

/** A buff gets one warning this many seconds before it drops. */
const BUFF_WARNING_SECONDS = 30;

const GRID_COLUMNS = InventoryConstants.RowSize;
const GRID_ROWS = InventoryConstants.InventoryRows;
const GRID_FIRST = InventoryConstants.LastEquippableItemSlotIndex + 1;

const WORN_SLOTS = Array.from(
  { length: InventoryConstants.LastEquippableItemSlotIndex + 1 },
  (_, slot) => slot
);

function durabilityPercent(item: Item): number | null {
  const def = itemDef(item.group, item.num);
  if (!def) return null;

  const max = calcMaxDurability(
    def,
    item.lvl ?? 0,
    item.isExcellent === true,
    item.isAncient === true
  );
  if (max <= 0) return null;

  return Math.round(((item.durability ?? max) / max) * 100);
}

/** Whether a 1x1 item would still find a square in the inventory grid. */
function gridHasRoom(items: (Item | null)[]): boolean {
  const used = new Uint8Array(GRID_COLUMNS * GRID_ROWS);

  for (let square = 0; square < GRID_COLUMNS * GRID_ROWS; square++) {
    const item = items[GRID_FIRST + square];
    if (!item) continue;
    const { w, h } = itemSquares(item);
    stampSquares(used, GRID_COLUMNS, GRID_ROWS, square, w, h);
  }

  for (let square = 0; square < GRID_COLUMNS * GRID_ROWS; square++) {
    if (squareFits(used, GRID_COLUMNS, GRID_ROWS, square, 1, 1)) return true;
  }

  return false;
}

/** The healing potions the Q/W/E/R keys would reach for, summed. */
function healingPotions(items: (Item | null)[]): number {
  let total = 0;
  for (let hotkey = 0; hotkey < Store.itemHotkeys.length; hotkey++) {
    const slot = findHotkeyItem(items, hotkey, Store.itemHotkeys[hotkey]);
    if (slot < 0) continue;
    total += items[slot]?.durability ?? 1;
  }
  return total;
}

function warn(text: string): void {
  Notices.create(text);
}

export function watchStateWarnings(): void {
  /** Worn slot -> the lowest step already warned about. */
  const warnedDurability = new Map<number, number>();
  let warnedFull = false;
  let warnedPotions = false;
  const warnedBuffs = new Set<number>();

  reaction(
    () =>
      WORN_SLOTS.map(slot => {
        const item = Store.playerData.items[slot];
        return item ? durabilityPercent(item) : null;
      }),
    percents => {
      if (!GameOptions.stateWarnings) return;

      percents.forEach((percent, slot) => {
        if (percent === null) {
          warnedDurability.delete(slot);
          return;
        }

        const step = DURABILITY_STEPS.find(limit => percent <= limit);
        if (step === undefined) {
          // Repaired back above every step: the warnings re-arm.
          warnedDurability.delete(slot);
          return;
        }

        if (warnedDurability.get(slot) === step) return;
        warnedDurability.set(slot, step);
        warn(t('warn.durability', { percent }));
      });
    },
    { equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]) }
  );

  reaction(
    () => gridHasRoom(Store.playerData.items),
    room => {
      if (room) {
        warnedFull = false;
        return;
      }
      if (!GameOptions.stateWarnings || warnedFull) return;
      warnedFull = true;
      warn(t('warn.inventoryFull'));
    }
  );

  reaction(
    () => healingPotions(Store.playerData.items),
    left => {
      if (left > 0) {
        warnedPotions = false;
        return;
      }
      if (!GameOptions.stateWarnings || warnedPotions) return;
      warnedPotions = true;
      warn(t('warn.noPotions'));
    }
  );

  // Buffs: the list is observable, the remaining seconds are not, so the
  // check rides a slow interval rather than a reaction.
  setInterval(() => {
    if (!GameOptions.stateWarnings) return;

    const active = new Set<number>();
    for (const buff of skills.activeBuffs) {
      active.add(buff.id);
      if (buff.kind === 'debuff') continue;

      const remaining = skills.buffRemaining(buff.id);
      if (remaining === null || remaining > BUFF_WARNING_SECONDS) {
        // Recast: the effect id stays, the clock does not, so it may warn again.
        warnedBuffs.delete(buff.id);
        continue;
      }
      if (warnedBuffs.has(buff.id)) continue;

      warnedBuffs.add(buff.id);
      warn(t('warn.buffEnding', { name: buff.name }));
    }

    // A buff that dropped (or was recast) may warn again.
    for (const id of warnedBuffs) {
      if (!active.has(id)) warnedBuffs.delete(id);
    }
  }, 1000);
}
