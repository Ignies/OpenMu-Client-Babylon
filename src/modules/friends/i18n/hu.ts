/** hu text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Saját magadat nem veheted fel barátnak.',
  'friends.alreadyOnList': '{name} már szerepel a barátlistádon.',
  'friends.listFull': 'A barátlistád megtelt.',
  'friends.requestSent': 'Barátkérés elküldve {name} nevű játékosnak.',
  'friends.requestFailed': 'A barátkérést nem sikerült elküldeni.',
  'friends.added': '{name} felkerült a barátlistádra.',
  'friends.cannotLetterSelf': 'Saját magadnak nem küldhetsz levelet.',
  'friends.letterArrived': 'Új levél érkezett. Feladó: {name}.',
  'friends.letterDeleteFailed': 'A levelet nem sikerült törölni.',
  'friends.letterSent': 'A levél elküldve.',
  'friends.letterTryAgain': 'A levelet nem sikerült elküldeni. Próbáld újra.',
  'friends.mailboxFull': 'Az a postafiók megtelt.',
  'friends.noSuchCharacter': 'Nincs ilyen nevű karakter.',
  'friends.letterNeedsZen': 'Nincs elég Zened a levél elküldéséhez.',
  'friends.letterFailed': 'A levelet nem sikerült elküldeni.',
} satisfies Partial<Record<keyof typeof en, string>>;
