import { reaction } from 'mobx';
import { Ecs } from '@/ecs/current';
import { GameOptions } from '@/controllers/settings';
import { Hero } from '@/modules/hero';
import { serverSetting } from '../servers/serverManifest';
import { findHotkeyItem, UNBOUND_HOTKEY } from './itemHotkeys';
import { Bag } from './state';

/** Under this share of the bar the mana counts as run out. */
const LOW_MANA = 0.1;
/** At most one potion this often. */
const DRINK_MS = 1000;
/** The W key, unbound: the biggest mana potion in the bag (`GetHotKeyItemIndex`). */
const MANA_KEY = 1;

/**
 * Ours, where the world's `server.json` sets `autoManaPotion` and the player's option is on: mana
 * under a tenth drinks the potion the unbound W key would, through the same request. The original
 * never drinks by itself. Readme: "Automatic mana potion".
 */
export function installAutoMana(): void {
  let lastDrink = -Infinity;

  reaction(
    () => Hero.currentMP,
    mana => {
      if (!GameOptions.autoManaPotion || !serverSetting('autoManaPotion')) return;
      if (mana >= Hero.maxMP * LOW_MANA || Hero.currentHP <= 0 || !Ecs.world?.playerEntity) return;
      const now = Date.now();
      if (now - lastDrink < DRINK_MS) return;
      const slot = findHotkeyItem(Hero.items, MANA_KEY, UNBOUND_HOTKEY);
      if (slot < 0) return;
      lastDrink = now;
      Bag.consumeItemRequest(slot);
    }
  );
}
