/** German text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': 'Suchen...',
  'search.hint': 'Tippen, um alles Unpassende auszublenden. Esc löscht.',
} satisfies Partial<Record<keyof typeof en, string>>;
