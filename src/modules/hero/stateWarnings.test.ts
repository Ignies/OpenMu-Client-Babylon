import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
const notices = vi.hoisted(() => [] as string[]);
vi.mock('../chat/notices', () => ({ Notices: { create: (text: string) => notices.push(text) } }));

import { runInAction } from 'mobx';
import { InventoryConstants } from '@/core/inventoryConstants';
import type { Item } from '@/ecs/world';
import { t } from '../../i18n';
import { Hero } from './state';
import { watchStateWarnings } from './stateWarnings';

const GRID = InventoryConstants.LastEquippableItemSlotIndex + 1;
const potion = (num: number, count: number): Item => ({ group: 14, num, durability: count });

describe('the no healing potions warning', () => {
  vi.useFakeTimers(); // the buff check's interval
  watchStateWarnings();

  it('counts healing potions only, not mana, antidote or shield potions', () => {
    runInAction(() => {
      Hero.items[GRID] = potion(3, 5); // Large Healing Potion
      Hero.items[GRID + 1] = potion(6, 20); // Large Mana Potion
      Hero.items[GRID + 2] = potion(8, 1); // Antidote
      Hero.items[GRID + 3] = potion(37, 3); // Large Shield Potion
    });
    expect(notices).toEqual([]);

    runInAction(() => (Hero.items[GRID] = null));
    expect(notices).toEqual([t('warn.noPotions')]);
  });
});
