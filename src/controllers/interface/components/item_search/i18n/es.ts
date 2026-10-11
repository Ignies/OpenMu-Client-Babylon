/** Spanish text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': 'Buscar...',
  'search.hint': 'Escribe para atenuar lo que no coincida. Esc borra.',
} satisfies Partial<Record<keyof typeof en, string>>;
