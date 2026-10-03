/** French text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Vous ne pouvez pas vous ajouter vous-même.',
  'friends.alreadyOnList': '{name} est déjà dans votre liste d’amis.',
  'friends.listFull': 'Votre liste d’amis est pleine.',
  'friends.requestSent': 'Demande d’ami envoyée à {name}.',
  'friends.requestFailed': 'La demande d’ami n’a pas pu être envoyée.',
  'friends.added': '{name} a été ajouté à votre liste d’amis.',
  'friends.cannotLetterSelf': 'Vous ne pouvez pas vous envoyer une lettre.',
  'friends.letterArrived': 'Une lettre est arrivée de {name}.',
  'friends.letterDeleteFailed': 'La lettre n’a pas pu être supprimée.',
  'friends.letterSent': 'La lettre a été envoyée.',
  'friends.letterTryAgain': 'La lettre n’a pas pu être envoyée. Réessayez.',
  'friends.mailboxFull': 'Cette boîte aux lettres est pleine.',
  'friends.noSuchCharacter': 'Aucun personnage ne porte ce nom.',
  'friends.letterNeedsZen':
    'Vous n’avez pas assez de Zen pour envoyer une lettre.',
  'friends.letterFailed': 'La lettre n’a pas pu être envoyée.',
} satisfies Partial<Record<keyof typeof en, string>>;
