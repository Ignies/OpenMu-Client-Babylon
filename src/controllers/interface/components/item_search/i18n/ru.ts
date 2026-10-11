/** Russian text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': 'Поиск...',
  'search.hint': 'Введите текст, чтобы приглушить несовпадающее. Esc очищает.',
} satisfies Partial<Record<keyof typeof en, string>>;
