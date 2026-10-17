import { afterEach, describe, expect, it, vi } from 'vitest';
import { InventoryConstants } from '@/core/inventoryConstants';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import type { Item } from '../../ecs/world';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
/** The world's `jewelryUpgrade`, set per test; every other setting is the original's. */
const server = vi.hoisted(() => ({ jewelryUpgrade: true }));
vi.mock('../servers/serverManifest', () => ({
  serverSetting: (key: string) => (key === 'jewelryUpgrade' ? server.jewelryUpgrade : false),
}));
const { jewelTargetError } = await import('./jewelUpgrade');
const { jewelryUpgradeAllowed } = await import('./jewelryUpgrade');

const IN_BAG = InventoryConstants.EquippableSlotsCount;
const item = (group: number, num: number, lvl = 0) => ({ group, num, lvl }) as Item;
const BLESS = item(14, 13);
const SOUL = item(14, 14);
const LIFE = item(14, 16);
const HARMONY = item(14, 42);
const RING_OF_FIRE = item(13, 21);
const PENDANT_OF_ICE = item(13, 25, 7);
const WIZARDS_RING = item(13, 20);

describe('dropping a jewel on gear', () => {
  afterEach(() => {
    server.jewelryUpgrade = true;
    setFidelityChoice(FIDELITY_DEFAULT, {});
  });

  it('lets a sword take Bless and refuses a ring, as the original', () => {
    expect(jewelTargetError(BLESS, item(0, 5), IN_BAG)).toBeNull();
    expect(jewelTargetError(BLESS, RING_OF_FIRE, IN_BAG)).not.toBeNull();
  });

  it('lets Bless, Soul and Life go on a ring or pendant when jewelry is allowed', () => {
    expect(jewelTargetError(BLESS, RING_OF_FIRE, IN_BAG, true)).toBeNull();
    expect(jewelTargetError(SOUL, PENDANT_OF_ICE, IN_BAG, true)).toBeNull();
    expect(jewelTargetError(LIFE, RING_OF_FIRE, IN_BAG, true)).toBeNull();
    expect(jewelTargetError(BLESS, PENDANT_OF_ICE, IN_BAG, true)).not.toBeNull();
    expect(jewelTargetError(HARMONY, RING_OF_FIRE, IN_BAG, true)).not.toBeNull();
    expect(jewelTargetError(BLESS, WIZARDS_RING, IN_BAG, true)).not.toBeNull();
  });

  it('allows jewelry with jewelryUpgrade on a world that allows it, never on Classic', () => {
    expect(jewelryUpgradeAllowed()).toBe(true);
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(jewelryUpgradeAllowed()).toBe(false);
    setFidelityChoice(FIDELITY_DEFAULT, { jewelryUpgrade: false });
    expect(jewelryUpgradeAllowed()).toBe(false);
    setFidelityChoice(FIDELITY_DEFAULT, {});
    server.jewelryUpgrade = false;
    expect(jewelryUpgradeAllowed()).toBe(false);
  });
});
