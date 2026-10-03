/** Portuguese text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': 'Buscar...',
  'search.hint': 'Digite para esmaecer o que não combina. Esc limpa.',
} satisfies Partial<Record<keyof typeof en, string>>;
