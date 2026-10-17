/** hi text of `src/ecs`. */

import type en from './en';

export default {
  'instrument.needStanding': 'वाद्य यंत्र निकालने के लिए स्थिर खड़े रहें',
  'notify.arrowsReloaded': 'तीर फिर से भरे गए',
  'notify.noMoreArrows': 'तीर खत्म हो गए',
} satisfies Partial<Record<keyof typeof en, string>>;
