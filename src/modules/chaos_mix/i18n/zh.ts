/** Chinese text of the `chaos_mix` module. */

import type en from './en';

export default {
  'jewelMix.lacking': '合成所需的道具不足。',
  'jewelMix.cannotDismantle': '无法拆分。',
} satisfies Partial<Record<keyof typeof en, string>>;
