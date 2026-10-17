/** id text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Kamu tidak dapat menambahkan dirimu sendiri sebagai teman.',
  'friends.alreadyOnList': '{name} sudah ada di daftar temanmu.',
  'friends.listFull': 'Daftar temanmu penuh.',
  'friends.requestSent': 'Permintaan pertemanan dikirim ke {name}.',
  'friends.requestFailed': 'Permintaan pertemanan tidak dapat dikirim.',
  'friends.added': '{name} ditambahkan ke daftar temanmu.',
  'friends.cannotLetterSelf': 'Kamu tidak dapat mengirim surat ke dirimu sendiri.',
  'friends.letterArrived': 'Surat dari {name} telah tiba.',
  'friends.letterDeleteFailed': 'Surat tidak dapat dihapus.',
  'friends.letterSent': 'Surat telah dikirim.',
  'friends.letterTryAgain': 'Surat tidak dapat dikirim. Coba lagi.',
  'friends.mailboxFull': 'Kotak surat itu penuh.',
  'friends.noSuchCharacter': 'Tidak ada karakter dengan nama itu.',
  'friends.letterNeedsZen': 'Zen-mu tidak cukup untuk mengirim surat.',
  'friends.letterFailed': 'Surat tidak dapat dikirim.',
} satisfies Partial<Record<keyof typeof en, string>>;
