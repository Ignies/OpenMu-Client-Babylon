/** id text of `versions/shared/ui/windows/party`. */

import type en from './en';

export default {
  'party.title': 'Party',
  'party.leader': 'Ketua Party',
  'party.leave': 'Keluar dari party',
  'party.kick': 'Keluarkan {name}',
  'party.nearby': 'Pemain di dekat',
  'party.nearbyEmpty': 'Berdirilah di dekat pemain untuk mengundangnya.',
  'party.tradeWith': 'Tukar dengan {name}',
  'party.notInParty': 'Tidak dalam party.',
  'party.invite': 'Undang',
  'party.shop': 'Toko',
} satisfies Partial<Record<keyof typeof en, string>>;
