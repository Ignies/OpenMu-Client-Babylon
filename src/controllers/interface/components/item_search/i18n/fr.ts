/** French text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': 'Rechercher...',
  'search.hint': 'Tapez pour estomper ce qui ne correspond pas. Échap efface.',
} satisfies Partial<Record<keyof typeof en, string>>;
