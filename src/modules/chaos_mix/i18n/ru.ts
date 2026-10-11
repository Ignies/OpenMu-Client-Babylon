/** Russian text of the `chaos_mix` module. */

import type en from './en';

export default {
  'jewelMix.lacking': 'Не хватает предметов для комбинации.',
  'jewelMix.cannotDismantle': 'Нельзя разделить.',
} satisfies Partial<Record<keyof typeof en, string>>;
