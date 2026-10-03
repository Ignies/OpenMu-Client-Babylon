/** Bulgarian text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': 'Търсене...',
  'search.hint': 'Пишете, за да избледнее всичко, което не съвпада. Esc изчиства.',
} satisfies Partial<Record<keyof typeof en, string>>;
