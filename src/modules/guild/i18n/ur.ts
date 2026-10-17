/** ur text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': 'کھلاڑی {name} نے گلڈ چھوڑ دیا۔',
  'guild.youLeft': 'آپ نے گلڈ چھوڑ دیا۔',
  'guild.disbanded': 'گلڈ توڑ دیا گیا۔',
  'guild.memberRemoved': 'رکن کو گلڈ سے نکال دیا گیا۔',
  'guild.onlyMasterRemoves': 'صرف گلڈ ماسٹر اراکین کو نکال سکتا ہے۔',
  'guild.wrongPassword': 'آپ کا درج کردہ پاس ورڈ غلط ہے۔',
  'guild.created': 'گلڈ بن گیا۔',
  'guild.nameTaken': 'یہ گلڈ نام پہلے سے لیا جا چکا ہے۔',
  'guild.createFailed': 'گلڈ نہیں بن سکا۔',
  'guild.joinRefused': 'گلڈ ماسٹر نے آپ کی درخواست رد کر دی۔',
  'guild.joined': 'آپ گلڈ میں شامل ہو گئے۔',
  'guild.isFull': 'گلڈ بھرا ہوا ہے۔',
  'guild.masterUnavailable': 'گلڈ ماسٹر دستیاب نہیں۔',
  'guild.masterBusy': 'گلڈ ماسٹر مصروف ہے۔ بعد میں کوشش کریں۔',
  'guild.needLevel6': 'گلڈ میں شامل ہونے کے لیے کم از کم لیول 6 ضروری ہے۔',
} satisfies Partial<Record<keyof typeof en, string>>;
