/** uk text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Не можна додати себе в друзі.',
  'friends.alreadyOnList': 'Гравець {name} уже є у вашому списку друзів.',
  'friends.listFull': 'Ваш список друзів заповнено.',
  'friends.requestSent': 'Запит на дружбу надіслано гравцеві {name}.',
  'friends.requestFailed': 'Не вдалося надіслати запит на дружбу.',
  'friends.added': 'Гравця {name} додано до вашого списку друзів.',
  'friends.cannotLetterSelf': 'Не можна надіслати лист собі.',
  'friends.letterArrived': 'Надійшов лист від гравця {name}.',
  'friends.letterDeleteFailed': 'Не вдалося видалити лист.',
  'friends.letterSent': 'Лист надіслано.',
  'friends.letterTryAgain': 'Не вдалося надіслати лист. Спробуйте ще раз.',
  'friends.mailboxFull': 'Ця поштова скринька переповнена.',
  'friends.noSuchCharacter': 'Персонажа з таким ім’ям немає.',
  'friends.letterNeedsZen': 'У вас недостатньо Zen, щоб надіслати лист.',
  'friends.letterFailed': 'Не вдалося надіслати лист.',
} satisfies Partial<Record<keyof typeof en, string>>;
