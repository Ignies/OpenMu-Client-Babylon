/** Vietnamese text of the `party` window. */

import type en from './en';

export default {
  'party.title': 'Tổ đội',
  'party.leader': 'Đội trưởng',
  'party.leave': 'Rời tổ đội',
  'party.kick': 'Mời {name} ra',
  'party.nearby': 'Người chơi gần đây',
  'party.nearbyEmpty': 'Đứng cạnh một người chơi để mời.',
  'party.tradeWith': 'Giao dịch với {name}',
  'party.notInParty': 'Không ở trong tổ đội.',
  'party.invite': 'Mời',
  'party.shop': 'Cửa hàng',
} satisfies Partial<Record<keyof typeof en, string>>;
