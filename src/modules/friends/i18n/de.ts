/** German text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf':
    'Du kannst dich nicht selbst als Freund hinzufügen.',
  'friends.alreadyOnList': '{name} steht schon auf deiner Freundesliste.',
  'friends.listFull': 'Deine Freundesliste ist voll.',
  'friends.requestSent': 'Freundschaftsanfrage an {name} gesendet.',
  'friends.requestFailed':
    'Die Freundschaftsanfrage konnte nicht gesendet werden.',
  'friends.added': '{name} wurde deiner Freundesliste hinzugefügt.',
  'friends.cannotLetterSelf': 'Du kannst dir selbst keinen Brief schicken.',
  'friends.letterArrived': 'Ein Brief von {name} ist angekommen.',
  'friends.letterDeleteFailed': 'Der Brief konnte nicht gelöscht werden.',
  'friends.letterSent': 'Der Brief wurde gesendet.',
  'friends.letterTryAgain':
    'Der Brief konnte nicht gesendet werden. Versuche es erneut.',
  'friends.mailboxFull': 'Dieser Briefkasten ist voll.',
  'friends.noSuchCharacter': 'Es gibt keinen Charakter mit diesem Namen.',
  'friends.letterNeedsZen':
    'Du hast nicht genug Zen, um einen Brief zu senden.',
  'friends.letterFailed': 'Der Brief konnte nicht gesendet werden.',
} satisfies Partial<Record<keyof typeof en, string>>;
