/** Korean text of the `buff_bar` HUD element. */

import type en from './en';

export default {
  'buff.debuff': '디버프',
  'buff.remainingSec': '{seconds}초',
  'buff.remainingMin': '{minutes}분 {seconds}초',
} satisfies Partial<Record<keyof typeof en, string>>;
