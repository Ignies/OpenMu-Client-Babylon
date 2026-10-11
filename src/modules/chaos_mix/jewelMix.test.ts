import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import type { Item } from '@/ecs/world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { JewelMix, packedJewels, singleCount } = await import('./jewelMix');
const { Hero } = await import('@/modules/hero');
const { Session } = await import('@/modules/session');
const { Social } = await import('@/modules/social/social');
const { t } = await import('@/i18n');

const sent: number[][] = [];
vi.spyOn(Session, 'sendToGS').mockImplementation(b => void sent.push([...new Uint8Array(b.buffer)]));
const errors = vi.spyOn(Social, 'errorMessage').mockImplementation(() => {});

const BLESS: Item = { group: 14, num: 13 };
const PACKED_SOUL_20: Item = { group: 12, num: 31, lvl: 1 };
/** C1 BC (LahapJewelMixRequest) and C1 31 (CloseNpcRequest), as sent. */
const CLOSE_NPC = 0x31;

function bag(fill: Record<number, Item>) {
  runInAction(() => {
    Hero.items = new Array<Item | null>(236).fill(null);
    for (const [slot, item] of Object.entries(fill)) Hero.items[Number(slot)] = item;
  });
}

const blesses = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [12 + i, BLESS]));

beforeEach(() => {
  runInAction(() => (Session.isOffline = false));
  sent.length = 0;
  errors.mockClear();
});

// CComGem.cpp: FindWantedList and CheckMyInvValid walk MAX_EQUIPMENT_INDEX..MAX_MY_INVENTORY_EX_INDEX.
describe('the bag Lahap looks at', () => {
  it('lists the packed jewels past the equipment and before the personal store', () => {
    bag({ 8: PACKED_SOUL_20, 20: PACKED_SOUL_20, 90: { group: 12, num: 141 }, 210: PACKED_SOUL_20, 30: BLESS });
    expect(packedJewels(Hero.items)).toEqual([
      { slot: 20, jewel: 1, level: 1 },
      { slot: 90, jewel: 7, level: 0 },
    ]);
  });

  it('counts single jewels up to the stack asked for', () => {
    bag({ ...blesses(25), 3: BLESS });
    expect(singleCount(Hero.items, 0, 20)).toBe(20);
    expect(singleCount(Hero.items, 0, 30)).toBe(25);
    expect(singleCount(Hero.items, 1, 10)).toBe(0);
  });
});

describe('combining jewels', () => {
  it('asks for 10 Jewels of Bless at 500,000 zen, sends Mix and closes Lahap', () => {
    bag(blesses(10));
    JewelMix.open();
    JewelMix.chooseCombine();
    JewelMix.chooseJewel(0);
    JewelMix.chooseSize(0);
    expect(JewelMix.box).toBe('combineCheck');
    expect(JewelMix.zen).toBe(500_000);

    JewelMix.confirm();
    expect(sent).toEqual([[0xc1, 7, 0xbc, 0, 0, 0, 0], [0xc1, 3, CLOSE_NPC]]);
    expect(JewelMix.box).toBeNull();
  });

  it('goes back to the jewel buttons when the bag is short (COMERROR_NOTALLOWED)', () => {
    bag(blesses(19));
    JewelMix.open();
    JewelMix.chooseCombine();
    JewelMix.chooseJewel(0);
    JewelMix.chooseSize(1);
    expect(errors).toHaveBeenCalledWith(t('jewelMix.lacking'));
    expect(JewelMix.box).toBe('combine');
    expect(JewelMix.jewel).toBe(-1);
    expect(sent).toEqual([]);
  });
});

describe('dismantling a packed jewel', () => {
  it('quotes 1,000,000 zen and sends Unmix with the bundle level and slot', () => {
    bag({ 40: PACKED_SOUL_20 });
    JewelMix.open();
    JewelMix.chooseDismantle();
    expect(JewelMix.box).toBe('dismantle');
    JewelMix.select(0);
    JewelMix.dismantle();
    expect(JewelMix.box).toBe('dismantleCheck');
    expect(JewelMix.zen).toBe(1_000_000);

    JewelMix.confirm();
    expect(sent).toEqual([[0xc1, 7, 0xbc, 1, 1, 1, 40], [0xc1, 3, CLOSE_NPC]]);
  });

  it('stays on the menu with nothing to dismantle', () => {
    bag(blesses(30));
    JewelMix.open();
    JewelMix.chooseDismantle();
    expect(errors).toHaveBeenCalledWith(t('jewelMix.cannotDismantle'));
    expect(JewelMix.box).toBe('menu');
  });

  it('Cancel on the check goes back to the same list', () => {
    bag({ 40: PACKED_SOUL_20 });
    JewelMix.open();
    JewelMix.chooseDismantle();
    JewelMix.select(0);
    JewelMix.dismantle();
    JewelMix.cancelCheck();
    expect(JewelMix.box).toBe('dismantle');
    expect(JewelMix.selected).toBe(0);
  });
});

describe('Close', () => {
  it('tells the server Lahap is closed', () => {
    JewelMix.open();
    JewelMix.exit();
    expect(JewelMix.box).toBeNull();
    expect(sent).toEqual([[0xc1, 3, CLOSE_NPC]]);
  });
});
