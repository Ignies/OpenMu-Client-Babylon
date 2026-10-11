/** German text of the `party` window. */

import type en from './en';

export default {
  'party.title': 'Gruppe',
  'party.leader': 'Gruppenleiter',
  'party.leave': 'Gruppe verlassen',
  'party.kick': '{name} hinauswerfen',
  'party.nearby': 'Spieler in der Nähe',
  'party.nearbyEmpty': 'Stell dich neben einen Spieler, um ihn einzuladen.',
  'party.tradeWith': 'Mit {name} handeln',
  'party.notInParty': 'Du bist in keiner Gruppe.',
  'party.invite': 'Einladen',
  'party.shop': 'Laden',
} satisfies Partial<Record<keyof typeof en, string>>;
