/** tr text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Kendini arkadaş olarak ekleyemezsin.',
  'friends.alreadyOnList': '{name} adlı oyuncu zaten arkadaş listende.',
  'friends.listFull': 'Arkadaş listen dolu.',
  'friends.requestSent': '{name} adlı oyuncuya arkadaşlık isteği gönderildi.',
  'friends.requestFailed': 'Arkadaşlık isteği gönderilemedi.',
  'friends.added': '{name} adlı oyuncu arkadaş listene eklendi.',
  'friends.cannotLetterSelf': 'Kendine mektup gönderemezsin.',
  'friends.letterArrived': '{name} adlı oyuncudan bir mektup geldi.',
  'friends.letterDeleteFailed': 'Mektup silinemedi.',
  'friends.letterSent': 'Mektup gönderildi.',
  'friends.letterTryAgain': 'Mektup gönderilemedi. Yeniden dene.',
  'friends.mailboxFull': 'O mektup kutusu dolu.',
  'friends.noSuchCharacter': 'Bu adda bir karakter yok.',
  'friends.letterNeedsZen': 'Mektup göndermek için yeterli Zen\'in yok.',
  'friends.letterFailed': 'Mektup gönderilemedi.',
} satisfies Partial<Record<keyof typeof en, string>>;
