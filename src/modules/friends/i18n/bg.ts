/** Bulgarian text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Не можеш да добавиш себе си като приятел.',
  'friends.alreadyOnList': '{name} вече е в списъка ти с приятели.',
  'friends.listFull': 'Списъкът ти с приятели е пълен.',
  'friends.requestSent': 'Покана за приятелство е изпратена до {name}.',
  'friends.requestFailed': 'Поканата за приятелство не можа да се изпрати.',
  'friends.added': '{name} беше добавен в списъка ти с приятели.',
  'friends.cannotLetterSelf': 'Не можеш да си пратиш писмо.',
  'friends.letterArrived': 'Пристигна писмо от {name}.',
  'friends.letterDeleteFailed': 'Писмото не можа да се изтрие.',
  'friends.letterSent': 'Писмото беше изпратено.',
  'friends.letterTryAgain': 'Писмото не можа да се изпрати. Опитай пак.',
  'friends.mailboxFull': 'Тази пощенска кутия е пълна.',
  'friends.noSuchCharacter': 'Няма герой с такова име.',
  'friends.letterNeedsZen': 'Нямаш достатъчно Zen, за да изпратиш писмо.',
  'friends.letterFailed': 'Писмото не можа да се изпрати.',
} satisfies Partial<Record<keyof typeof en, string>>;
