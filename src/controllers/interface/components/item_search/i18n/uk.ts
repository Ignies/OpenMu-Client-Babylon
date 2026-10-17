/** uk text of `src/controllers/interface/components/item_search`. */

import type en from './en';

export default {
  'search.placeholder': 'Пошук...',
  'search.hint': 'Вводьте текст, щоб приглушити все, що не збігається. Esc очищає.',
} satisfies Partial<Record<keyof typeof en, string>>;
