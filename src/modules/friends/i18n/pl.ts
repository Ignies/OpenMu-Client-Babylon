/** Polish text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Nie możesz dodać siebie do znajomych.',
  'friends.alreadyOnList': '{name} jest już na twojej liście znajomych.',
  'friends.listFull': 'Twoja lista znajomych jest pełna.',
  'friends.requestSent': 'Wysłano zaproszenie do znajomych: {name}.',
  'friends.requestFailed': 'Nie udało się wysłać zaproszenia do znajomych.',
  'friends.added': 'Dodano do listy znajomych: {name}.',
  'friends.cannotLetterSelf': 'Nie możesz wysłać listu do siebie.',
  'friends.letterArrived': 'Nowy list od: {name}.',
  'friends.letterDeleteFailed': 'Nie udało się usunąć listu.',
  'friends.letterSent': 'List został wysłany.',
  'friends.letterTryAgain': 'Nie udało się wysłać listu. Spróbuj ponownie.',
  'friends.mailboxFull': 'Ta skrzynka na listy jest pełna.',
  'friends.noSuchCharacter': 'Nie ma postaci o tej nazwie.',
  'friends.letterNeedsZen': 'Nie masz wystarczająco Zen, aby wysłać list.',
  'friends.letterFailed': 'Nie udało się wysłać listu.',
} satisfies Partial<Record<keyof typeof en, string>>;
