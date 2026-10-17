/** el text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Ακύρωση',
  'common.close': 'Κλείσιμο',
  'common.none': 'Κανένα',
  'common.create': 'Δημιουργία',
  'common.creating': 'Δημιουργία...',
  'common.send': 'Αποστολή',
  'common.sending': 'Αποστολή...',
  'common.loading': 'Φόρτωση...',
  'common.warning': 'Προειδοποίηση',
  'common.level': 'Επίπεδο',
  'common.offline': 'Εκτός σύνδεσης',
  'common.off': 'Ανενεργό',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Δεν έχετε αρκετά Zen',
  'options.quality.classic': 'Κλασικό',
  'options.quality.enhanced': 'Βελτιωμένο',
} satisfies Partial<Record<keyof typeof en, string>>;
