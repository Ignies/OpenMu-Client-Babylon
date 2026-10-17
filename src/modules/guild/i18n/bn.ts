/** bn text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': 'খেলোয়াড় {name} গিল্ড ছেড়ে গেছেন।',
  'guild.youLeft': 'আপনি গিল্ড ছেড়েছেন।',
  'guild.disbanded': 'গিল্ড ভেঙে দেওয়া হয়েছে।',
  'guild.memberRemoved': 'সদস্যকে গিল্ড থেকে বের করা হয়েছে।',
  'guild.onlyMasterRemoves': 'শুধু গিল্ড মাস্টার সদস্যদের বের করতে পারেন।',
  'guild.wrongPassword': 'আপনার দেওয়া পাসওয়ার্ড ভুল।',
  'guild.created': 'গিল্ড তৈরি হয়েছে।',
  'guild.nameTaken': 'এই গিল্ডের নাম আগেই নেওয়া হয়েছে।',
  'guild.createFailed': 'গিল্ড তৈরি করা যায়নি।',
  'guild.joinRefused': 'গিল্ড মাস্টার আপনার অনুরোধ প্রত্যাখ্যান করেছেন।',
  'guild.joined': 'আপনি গিল্ডে যোগ দিয়েছেন।',
  'guild.isFull': 'গিল্ড পূর্ণ।',
  'guild.masterUnavailable': 'গিল্ড মাস্টার এখন উপলব্ধ নন।',
  'guild.masterBusy': 'গিল্ড মাস্টার ব্যস্ত। পরে আবার চেষ্টা করুন।',
  'guild.needLevel6': 'গিল্ডে যোগ দিতে আপনার অন্তত লেভেল 6 হতে হবে।',
} satisfies Partial<Record<keyof typeof en, string>>;
