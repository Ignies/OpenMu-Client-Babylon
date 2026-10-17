/**
 * THE LIST - every language the client ships, in the order the selector shows
 * them. English first (it is the fallback), then the rest alphabetically by
 * their English name.
 *
 * The only place languages are enumerated.
 */

import type { LanguageLayer } from './layer';

import { englishLayer } from './english';
import { arabicLayer } from './arabic';
import { basqueLayer } from './basque';
import { bengaliLayer } from './bengali';
import { bulgarianLayer } from './bulgarian';
import { catalanLayer } from './catalan';
import { chineseLayer } from './chinese';
import { czechLayer } from './czech';
import { frenchLayer } from './french';
import { germanLayer } from './german';
import { greekLayer } from './greek';
import { hindiLayer } from './hindi';
import { hungarianLayer } from './hungarian';
import { indonesianLayer } from './indonesian';
import { italianLayer } from './italian';
import { japaneseLayer } from './japanese';
import { koreanLayer } from './korean';
import { polishLayer } from './polish';
import { portugueseLayer } from './portuguese';
import { romanianLayer } from './romanian';
import { russianLayer } from './russian';
import { serbianLayer } from './serbian';
import { spanishLayer } from './spanish';
import { thaiLayer } from './thai';
import { turkishLayer } from './turkish';
import { ukrainianLayer } from './ukrainian';
import { vietnameseLayer } from './vietnamese';

export const LANGUAGE_LAYERS: readonly LanguageLayer[] = [
  englishLayer,
  arabicLayer,
  basqueLayer,
  bengaliLayer,
  bulgarianLayer,
  catalanLayer,
  chineseLayer,
  czechLayer,
  frenchLayer,
  germanLayer,
  greekLayer,
  hindiLayer,
  hungarianLayer,
  indonesianLayer,
  italianLayer,
  japaneseLayer,
  koreanLayer,
  polishLayer,
  portugueseLayer,
  romanianLayer,
  russianLayer,
  serbianLayer,
  spanishLayer,
  thaiLayer,
  turkishLayer,
  ukrainianLayer,
  vietnameseLayer,
];
