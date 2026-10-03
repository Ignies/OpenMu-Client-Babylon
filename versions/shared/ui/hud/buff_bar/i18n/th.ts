/** Thai text of the `buff_bar` HUD element. */

import type en from './en';

export default {
  'buff.debuff': 'ดีบัฟ',
  'buff.remainingSec': '{seconds} วิ',
  'buff.remainingMin': '{minutes} นาที {seconds} วิ',
} satisfies Partial<Record<keyof typeof en, string>>;
