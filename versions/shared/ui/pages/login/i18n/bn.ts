/** bn text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'আপনার অ্যাকাউন্টের নাম ও পাসওয়ার্ড লিখুন',
  'login.createAccount': 'অ্যাকাউন্ট তৈরি করুন',
  'login.rememberMe': 'আমাকে মনে রাখবেন?',
  'register.id': 'ID',
  'register.password': 'পাসওয়ার্ড',
  'register.confirm': 'নিশ্চিত করুন',
  'register.fillEveryField': 'অনুগ্রহ করে সব ঘর পূরণ করুন।',
  'register.idTooShort': 'ID অন্তত {min} অক্ষরের হতে হবে।',
  'register.idChars': 'ID-তে শুধু অক্ষর ও সংখ্যা থাকতে পারে।',
  'register.passwordTooShort': 'পাসওয়ার্ড অন্তত {min} অক্ষরের হতে হবে।',
  'register.passwordChars': 'পাসওয়ার্ডে শুধু অক্ষর, সংখ্যা ও সাধারণ চিহ্ন থাকতে পারে।',
  'register.mismatch': 'পাসওয়ার্ড দুটি মেলেনি।',
  'register.unreachable': 'সার্ভারে পৌঁছানো যায়নি।',
  'register.failed': 'নিবন্ধন ব্যর্থ হয়েছে ({status})।',
  'register.created': 'অ্যাকাউন্ট তৈরি হয়েছে। এখন আপনি লগইন করতে পারেন।',
  'login.savedLogin': 'সংরক্ষিত লগইন',
} satisfies Partial<Record<keyof typeof en, string>>;
