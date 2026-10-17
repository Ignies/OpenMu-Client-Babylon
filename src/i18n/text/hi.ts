/** hi text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'ठीक है',
  'common.cancel': 'रद्द करें',
  'common.close': 'बंद करें',
  'common.none': 'कोई नहीं',
  'common.create': 'बनाएं',
  'common.creating': 'बनाया जा रहा है...',
  'common.send': 'भेजें',
  'common.sending': 'भेजा जा रहा है...',
  'common.loading': 'लोड हो रहा है...',
  'common.warning': 'चेतावनी',
  'common.level': 'लेवल',
  'common.offline': 'ऑफ़लाइन',
  'common.off': 'बंद',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'पर्याप्त Zen नहीं है',
  'options.quality.classic': 'क्लासिक',
  'options.quality.enhanced': 'उन्नत',
} satisfies Partial<Record<keyof typeof en, string>>;
