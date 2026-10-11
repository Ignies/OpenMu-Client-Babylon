/** Romanian text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': 'Caută...',
  'search.hint': 'Scrie pentru a estompa ce nu se potrivește. Esc șterge.',
} satisfies Partial<Record<keyof typeof en, string>>;
