import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import type { Item } from '@/ecs/world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

/** The world's `autoManaPotion`, set per test. */
const world = vi.hoisted(() => ({ allows: true }));
vi.mock('../servers/serverManifest', async importOriginal => ({
  ...(await importOriginal<typeof import('../servers/serverManifest')>()),
  serverSetting: (key: string) => (key === 'autoManaPotion' ? world.allows : false),
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installAutoMana } = await import('./autoMana');
const { Bag } = await import('./state');
const { Hero } = await import('@/modules/hero');
const { Ecs } = await import('@/ecs/current');
const { setGameOption } = await import('@/controllers/settings');

installAutoMana();

const MANA_SLOT = 20;
const HEALTH_SLOT = 21;

/** The mana bar drops to `mp` of 100; the bag slots the potion requests went to. */
function dropTo(mp: number): number[] {
  const used = vi.spyOn(Bag, 'consumeItemRequest').mockImplementation(() => {});
  runInAction(() => (Hero.currentMP = mp));
  const slots = used.mock.calls.map(c => c[0]);
  used.mockRestore();
  return slots;
}

describe('the automatic mana potion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    world.allows = true;
    setGameOption('autoManaPotion', true);
    runInAction(() => {
      Ecs.world = { playerEntity: {} } as unknown as typeof Ecs.world;
      Hero.maxMP = 100;
      Hero.currentMP = 100;
      Hero.currentHP = 50;
      Hero.items[MANA_SLOT] = { group: 14, num: 5, durability: 3 } as Item;
      Hero.items[HEALTH_SLOT] = { group: 14, num: 3, durability: 3 } as Item;
    });
  });

  afterEach(() => {
    vi.advanceTimersByTime(5000);
    vi.useRealTimers();
    setGameOption('autoManaPotion', false);
    runInAction(() => {
      Hero.items[MANA_SLOT] = null;
      Hero.items[HEALTH_SLOT] = null;
      Ecs.world = null;
    });
  });

  it('drinks the mana potion the unbound W key would once the mana runs low, once a second', () => {
    expect(dropTo(30)).toEqual([]);
    expect(dropTo(8)).toEqual([MANA_SLOT]);
    expect(dropTo(6)).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(dropTo(4)).toEqual([MANA_SLOT]);
  });

  it('does nothing where the server does not allow it', () => {
    world.allows = false;
    expect(dropTo(5)).toEqual([]);
  });

  it('does nothing until the player turns it on', () => {
    setGameOption('autoManaPotion', false);
    expect(dropTo(5)).toEqual([]);
  });

  it('does nothing for a dead hero or with no mana potion in the bag', () => {
    runInAction(() => (Hero.currentHP = 0));
    expect(dropTo(5)).toEqual([]);
    runInAction(() => {
      Hero.currentHP = 50;
      Hero.currentMP = 100;
      Hero.items[MANA_SLOT] = null;
    });
    expect(dropTo(5)).toEqual([]);
  });
});
