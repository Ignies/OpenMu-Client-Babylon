/** French text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': 'Ce monde liste un module illisible ({id}) : ignoré',
  'moduleStream.api': 'Le module {id} demande l\'API de modules {range}, ce client fournit {have} : ignoré',
  'moduleStream.download': 'Le module {id} n\'a pas pu être téléchargé : ignoré',
  'moduleStream.hash': 'Le module {id} ne correspond pas à son empreinte : ignoré',
  'moduleStream.core': 'Le module {id} se dit module de base : refusé',
  'moduleStream.builtIn': 'Le module {id} porte le nom d\'un module intégré : refusé',
  'moduleStream.declined': 'Le module {id} n\'a pas été autorisé : ignoré',
  'moduleStream.failed': 'Le module {id} n\'a pas pu démarrer : déchargé',
} satisfies Partial<Record<keyof typeof en, string>>;
