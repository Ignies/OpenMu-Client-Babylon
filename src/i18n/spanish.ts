/**
 * Spanish. MU's own proper nouns (class names, event names, Zen, MU Helper)
 * stay as they are - that is what the Spanish-speaking servers and their
 * guides call them.
 */

import type { LanguageLayer } from './layer';
import { SPANISH_PACK_REPAIRS } from './packRepairs';
import { SPANISH_ITEM_NAMES } from './itemNames';
import { SPANISH_DIALOG_PAGES } from './dialogPages';

export const spanishLayer: LanguageLayer = {
  name: 'spanish',
  code: 'es',
  aliases: ['es-ES', 'es-MX', 'es-AR', 'es-CL', 'es-CO', 'es-419'],
  label: 'Español',
  region: 'ES',
  // Webzen's own Spanish tables: quest names and NPC dialogue, the warp list,
  // the master-skill tooltips (`Data/Local/Spn/`).
  dataPack: {
    folder: 'Spn',
    suffix: 'spn',
    encoding: 'windows-1252',
    repairs: SPANISH_PACK_REPAIRS,
    itemNames: SPANISH_ITEM_NAMES,
    dialogPages: SPANISH_DIALOG_PAGES,
  },
};
