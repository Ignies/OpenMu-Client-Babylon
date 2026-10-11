/** French text of the `party` window. */

import type en from './en';

export default {
  'party.title': 'Groupe',
  'party.leader': 'Chef de groupe',
  'party.leave': 'Quitter le groupe',
  'party.kick': 'Exclure {name}',
  'party.nearby': 'Joueurs à proximité',
  'party.nearbyEmpty': 'Placez-vous près d’un joueur pour l’inviter.',
  'party.tradeWith': 'Échanger avec {name}',
  'party.notInParty': 'Vous n’êtes pas dans un groupe.',
  'party.invite': 'Inviter',
  'party.shop': 'Boutique',
} satisfies Partial<Record<keyof typeof en, string>>;
