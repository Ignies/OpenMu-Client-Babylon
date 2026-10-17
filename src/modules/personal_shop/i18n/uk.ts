/** uk text of `src/modules/personal_shop`. */

import type en from './en';

export default {
  'personalShop.disabled': 'Особисті крамниці на цьому сервері вимкнено.',
  'personalShop.slotNotInShop': 'Ця комірка не належить до крамниці.',
  'personalShop.priceNotSet': 'Не вдалося встановити ціну.',
} satisfies Partial<Record<keyof typeof en, string>>;
