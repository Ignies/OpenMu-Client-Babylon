import { describe, expect, it } from 'vitest';
import { storageBan, StorageKind } from './itemStorage';
import { ItemGroup } from '../../controllers/item_rules/itemStats';
import { EN_TEXT } from '../../i18n';
import type { Item } from '../../ecs/world';

const item = (over: Partial<Item> = {}): Item => ({ group: ItemGroup.Sword, num: 0, lvl: 0, ...over });

describe('storageBan', () => {
  it('names a translated refusal per storage', () => {
    const questBox = item({ group: ItemGroup.Potion, num: 21, lvl: 0 });
    const pendant = item({ group: ItemGroup.Helper, num: 38 });

    expect(storageBan(StorageKind.Vault, questBox)).toBe('notify.cannotStore');
    expect(storageBan(StorageKind.Trade, pendant)).toBe('notify.cannotTrade');
    for (const kind of [StorageKind.Vault, StorageKind.Trade, StorageKind.PersonalShop]) {
      const key = storageBan(kind, questBox) ?? storageBan(kind, pendant);
      if (key) expect(EN_TEXT[key]).toBeDefined();
    }
  });

  it('lets an ordinary item through', () => {
    expect(storageBan(StorageKind.Vault, item())).toBeNull();
    expect(storageBan(StorageKind.Inventory, item({ group: ItemGroup.Potion, num: 21 }))).toBeNull();
  });
});
