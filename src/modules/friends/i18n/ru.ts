/** Russian text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Нельзя добавить себя в друзья.',
  'friends.alreadyOnList': '{name} уже в вашем списке друзей.',
  'friends.listFull': 'Ваш список друзей заполнен.',
  'friends.requestSent': 'Запрос дружбы отправлен игроку {name}.',
  'friends.requestFailed': 'Запрос дружбы не удалось отправить.',
  'friends.added': '{name} добавлен в ваш список друзей.',
  'friends.cannotLetterSelf': 'Нельзя отправить письмо самому себе.',
  'friends.letterArrived': 'Пришло письмо от {name}.',
  'friends.letterDeleteFailed': 'Письмо не удалось удалить.',
  'friends.letterSent': 'Письмо отправлено.',
  'friends.letterTryAgain':
    'Письмо не удалось отправить. Попробуйте ещё раз.',
  'friends.mailboxFull': 'Этот почтовый ящик переполнен.',
  'friends.noSuchCharacter': 'Персонажа с таким именем нет.',
  'friends.letterNeedsZen': 'У вас недостаточно Zen, чтобы отправить письмо.',
  'friends.letterFailed': 'Письмо не удалось отправить.',
} satisfies Partial<Record<keyof typeof en, string>>;
