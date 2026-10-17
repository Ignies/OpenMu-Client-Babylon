/** ur text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'آپ خود کو دوست نہیں بنا سکتے۔',
  'friends.alreadyOnList': 'کھلاڑی {name} پہلے ہی آپ کی دوستوں کی فہرست میں ہے۔',
  'friends.listFull': 'آپ کی دوستوں کی فہرست بھری ہوئی ہے۔',
  'friends.requestSent': 'کھلاڑی {name} کو دوستی کی درخواست بھیج دی گئی۔',
  'friends.requestFailed': 'دوستی کی درخواست نہیں بھیجی جا سکی۔',
  'friends.added': 'کھلاڑی {name} کو آپ کی دوستوں کی فہرست میں شامل کر دیا گیا۔',
  'friends.cannotLetterSelf': 'آپ خود کو خط نہیں بھیج سکتے۔',
  'friends.letterArrived': 'کھلاڑی {name} کی طرف سے خط آیا ہے۔',
  'friends.letterDeleteFailed': 'خط مٹایا نہیں جا سکا۔',
  'friends.letterSent': 'خط بھیج دیا گیا۔',
  'friends.letterTryAgain': 'خط نہیں بھیجا جا سکا۔ دوبارہ کوشش کریں۔',
  'friends.mailboxFull': 'یہ ڈاک خانہ بھرا ہوا ہے۔',
  'friends.noSuchCharacter': 'اس نام کا کوئی کردار نہیں۔',
  'friends.letterNeedsZen': 'خط بھیجنے کے لیے آپ کے پاس Zen کافی نہیں۔',
  'friends.letterFailed': 'خط نہیں بھیجا جا سکا۔',
} satisfies Partial<Record<keyof typeof en, string>>;
