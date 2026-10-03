/** Russian text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled': 'Личные лавки на этом сервере отключены.',
  'personalShop.slotNotInShop': 'Эта ячейка не относится к лавке.',
  'personalShop.priceNotSet': 'Цену не удалось установить.',
} satisfies Partial<Record<keyof typeof en, string>>;
