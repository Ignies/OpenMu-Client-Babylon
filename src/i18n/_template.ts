/**
 * Copy me to add a language: `cp _template.ts <language>.ts`, fill the two
 * sections, then add `<language>Layer` to `layers.ts`. The text comes next:
 * `bun tools/i18n.ts export <code> sheet.csv`, translate, then
 * `bun tools/i18n.ts import <code> sheet.csv` writes one `i18n/<code>.ts` into
 * every owner folder (docs/how_to/add_language.md).
 *
 * Compiling but never imported, on purpose.
 */

import type { LanguageLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** The language's own name for itself - what the selector shows. */
const LABEL = 'Language';

/**
 * Extra faces to put in front of Tahoma while this language is active. Only
 * needed for scripts the MU face has no glyphs for (CJK, Thai); leave it off
 * for anything Latin, Cyrillic or Greek.
 */
const FONT: string | undefined = undefined;

// ---- 2. the layer ----------------------------------------------------------

export const templateLayer: LanguageLayer = {
  name: 'template',
  code: 'xx',
  label: LABEL,
  region: 'GB',
  font: FONT,
};
