/**
 * Portuguese (Brazilian wording, `pt-BR` first among the aliases - that is
 * where most of MU's Portuguese-speaking players are). MU's proper nouns
 * (class names, event names, Zen, MU Helper) stay as they are.
 */

import type { LanguageLayer } from './layer';
import { PORTUGUESE_PACK_REPAIRS } from './packRepairs';
import { PORTUGUESE_DIALOG_PAGES } from './dialogPages';

export const portugueseLayer: LanguageLayer = {
  name: 'portuguese',
  code: 'pt',
  aliases: ['pt-BR', 'pt-PT'],
  label: 'Português',
  region: 'PT',
  // Webzen's own Portuguese tables: quest names and NPC dialogue, the warp
  // list, the master-skill tooltips (`Data/Local/Por/`).
  dataPack: {
    folder: 'Por',
    suffix: 'por',
    encoding: 'windows-1252',
    repairs: PORTUGUESE_PACK_REPAIRS,
    dialogPages: PORTUGUESE_DIALOG_PAGES,
  },
};
