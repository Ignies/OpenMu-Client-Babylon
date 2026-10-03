/** Italian text of the `party` window. */

import type en from './en';

export default {
  'party.title': 'Gruppo',
  'party.leader': 'Capogruppo',
  'party.leave': 'Lascia il gruppo',
  'party.kick': 'Espelli {name}',
  'party.nearby': 'Giocatori vicini',
  'party.nearbyEmpty': 'Mettiti accanto a un giocatore per invitarlo.',
  'party.tradeWith': 'Scambia con {name}',
  'party.notInParty': 'Non sei in un gruppo.',
  'party.invite': 'Invita',
  'party.shop': 'Negozio',
} satisfies Partial<Record<keyof typeof en, string>>;
