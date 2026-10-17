/** ar text of `versions/shared/ui/windows/party`. */

import type en from './en';

export default {
  'party.title': 'الفريق',
  'party.leader': 'قائد الفريق',
  'party.leave': 'مغادرة الفريق',
  'party.kick': 'طرد اللاعب {name}',
  'party.nearby': 'لاعبون قريبون',
  'party.nearbyEmpty': 'قف بجانب لاعب لدعوته.',
  'party.tradeWith': 'التبادل مع {name}',
  'party.notInParty': 'لست في فريق.',
  'party.invite': 'دعوة',
  'party.shop': 'المتجر',
} satisfies Partial<Record<keyof typeof en, string>>;
