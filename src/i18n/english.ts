/**
 * English — the source language.
 *
 * Its `strings` is the catalogue itself, so English is complete by
 * construction and is what every other entry falls back to line by line.
 */

import { EN_TEXT } from './recipes';
import type { LanguageLayer } from './layer';

export const englishLayer: LanguageLayer = {
  name: 'english',
  code: 'en',
  aliases: ['en-US', 'en-GB', 'en-AU', 'en-CA'],
  label: 'English',
  region: 'GB',
  dataPack: { folder: 'Eng', suffix: 'eng' },
  strings: EN_TEXT,
};
