/** ca text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'No pots afegir el teu propi personatge a la llista d\'amics.',
  'friends.alreadyOnList': 'El jugador {name} ja és a la teva llista d\'amics.',
  'friends.listFull': 'La teva llista d\'amics és plena.',
  'friends.requestSent': 'S\'ha enviat una sol·licitud d\'amistat al jugador {name}.',
  'friends.requestFailed': 'No s\'ha pogut enviar la sol·licitud d\'amistat.',
  'friends.added': 'S\'ha afegit el jugador {name} a la teva llista d\'amics.',
  'friends.cannotLetterSelf': 'No pots enviar cartes al teu propi personatge.',
  'friends.letterArrived': 'Has rebut una carta del jugador {name}.',
  'friends.letterDeleteFailed': 'No s\'ha pogut suprimir la carta.',
  'friends.letterSent': 'S\'ha enviat la carta.',
  'friends.letterTryAgain': 'No s\'ha pogut enviar la carta. Torna-ho a provar.',
  'friends.mailboxFull': 'Aquesta bústia és plena.',
  'friends.noSuchCharacter': 'No hi ha cap personatge amb aquest nom.',
  'friends.letterNeedsZen': 'No tens prou Zen per enviar una carta.',
  'friends.letterFailed': 'No s\'ha pogut enviar la carta.',
} satisfies Partial<Record<keyof typeof en, string>>;
