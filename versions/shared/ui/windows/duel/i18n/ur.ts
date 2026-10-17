/** ur text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': 'کھلاڑی {name} نے آپ کو دوبدو کی دعوت دی ہے۔',
  'duel.wins': 'کھلاڑی {winner} نے کھلاڑی {loser} کے خلاف دوبدو جیت لیا۔',
  'duel.watchTitle': 'دوبدو کی صورتحال',
  'duel.channel': 'دوبدو چینل {number}',
  'duel.emptyChannel': 'خالی چینل',
  'duel.join': 'دیکھیں',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'دوبدو چینل چھوڑیں',
  'duel.stop': 'دوبدو ختم کریں',
} satisfies Partial<Record<keyof typeof en, string>>;
