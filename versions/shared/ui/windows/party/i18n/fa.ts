/** fa text of `versions/shared/ui/windows/party`. */

import type en from './en';

export default {
  'party.title': 'گروه',
  'party.leader': 'رهبر گروه',
  'party.leave': 'ترک گروه',
  'party.kick': 'بیرون کردن بازیکن {name}',
  'party.nearby': 'بازیکنان نزدیک',
  'party.nearbyEmpty': 'برای دعوت، کنار یک بازیکن بایستید.',
  'party.tradeWith': 'معامله با بازیکن {name}',
  'party.notInParty': 'در گروهی نیستید.',
  'party.invite': 'دعوت',
  'party.shop': 'فروشگاه',
} satisfies Partial<Record<keyof typeof en, string>>;
