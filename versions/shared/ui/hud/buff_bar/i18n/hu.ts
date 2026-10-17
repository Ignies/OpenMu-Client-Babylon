/** hu text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': 'Gyengítés',
  'buff.remainingSec': '{seconds} mp',
  'buff.remainingMin': '{minutes} p {seconds} mp',
} satisfies Partial<Record<keyof typeof en, string>>;
