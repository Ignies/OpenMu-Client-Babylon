/**
 * THE LIST — every language the client ships, in the order the selector shows
 * them. English first (it is the fallback), then the rest alphabetically by
 * their English name.
 *
 * The only place languages are enumerated.
 */

import type { LanguageLayer } from './layer';

import { englishLayer } from './english';
import { bulgarianLayer } from './bulgarian';
import { chineseLayer } from './chinese';
import { frenchLayer } from './french';
import { germanLayer } from './german';
import { italianLayer } from './italian';
import { japaneseLayer } from './japanese';
import { koreanLayer } from './korean';
import { portugueseLayer } from './portuguese';
import { romanianLayer } from './romanian';
import { russianLayer } from './russian';
import { spanishLayer } from './spanish';
import { thaiLayer } from './thai';

export const LANGUAGE_LAYERS: readonly LanguageLayer[] = [
  englishLayer,
  bulgarianLayer,
  chineseLayer,
  frenchLayer,
  germanLayer,
  italianLayer,
  japaneseLayer,
  koreanLayer,
  portugueseLayer,
  romanianLayer,
  russianLayer,
  spanishLayer,
  thaiLayer,
];
