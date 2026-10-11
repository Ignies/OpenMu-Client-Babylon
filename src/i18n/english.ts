/**
 * English - the source language.
 *
 * Every owner's `i18n/en.ts` is required and holds every key it owns, so
 * English is complete and is what every other entry falls back to line by line.
 */

import type { LanguageLayer } from './layer';

export const englishLayer: LanguageLayer = {
  name: 'english',
  code: 'en',
  aliases: ['en-US', 'en-GB', 'en-AU', 'en-CA'],
  label: 'English',
  region: 'GB',
  dataPack: { folder: 'Eng', suffix: 'eng' },
};
