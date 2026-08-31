/**
 * Copy me to add a language: `cp _template.ts <language>.ts`, fill the three
 * sections, then add `<language>Layer` to `layers.ts`. Nothing else changes —
 * the selector lists whatever `layers.ts` holds, and `muFlag` already draws
 * every region in `FlagRegion`.
 *
 * Compiling but never imported, on purpose.
 */

import type { LanguageLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** The language's own name for itself — what the selector shows. */
const LABEL = 'Language';

/**
 * Extra faces to put in front of Tahoma while this language is active. Only
 * needed for scripts the MU face has no glyphs for (CJK, Thai); leave it off
 * for anything Latin, Cyrillic or Greek.
 */
const FONT: string | undefined = undefined;

// ---- 2. state + readers ----------------------------------------------------
// A language has neither: `strings` is data, and the facade owns the choice.

// ---- 3. the layer ----------------------------------------------------------

export const templateLayer: LanguageLayer = {
  name: 'template',
  code: 'xx',
  label: LABEL,
  region: 'GB',
  font: FONT,
  strings: {
    // 'common.ok': 'OK',
  },
};
