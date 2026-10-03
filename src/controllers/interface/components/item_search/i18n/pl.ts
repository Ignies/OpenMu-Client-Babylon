/** Polish text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': 'Szukaj...',
  'search.hint': 'Pisz, aby wygasić wszystko, co nie pasuje. Esc czyści.',
} satisfies Partial<Record<keyof typeof en, string>>;
