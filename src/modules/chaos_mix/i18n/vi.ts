/** Vietnamese text of the `chaos_mix` module. */

import type en from './en';

export default {
  'jewelMix.lacking': 'Thiếu vật phẩm để kết hợp.',
  'jewelMix.cannotDismantle': 'Không thể tách.',
} satisfies Partial<Record<keyof typeof en, string>>;
