/** Italian text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': 'Cerca...',
  'search.hint': 'Digita per sfumare ciò che non corrisponde. Esc cancella.',
} satisfies Partial<Record<keyof typeof en, string>>;
