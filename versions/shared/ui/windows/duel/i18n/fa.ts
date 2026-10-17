/** fa text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': 'بازیکن {name} شما را به دوئل فراخوانده است.',
  'duel.wins': 'بازیکن {winner} در دوئل بر بازیکن {loser} پیروز شد.',
  'duel.watchTitle': 'وضعیت دوئل',
  'duel.channel': 'کانال دوئل {number}',
  'duel.emptyChannel': 'کانال خالی',
  'duel.join': 'تماشا',
  'duel.vs': 'در برابر',
  'duel.leaveWatch': 'ترک کانال دوئل',
  'duel.stop': 'پایان دوئل',
} satisfies Partial<Record<keyof typeof en, string>>;
