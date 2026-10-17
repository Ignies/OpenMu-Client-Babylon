/** bn text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'গেম থেকে বের হওয়ার আগে Chaos উইন্ডো বন্ধ করুন।',
  'exit.noAnswer': 'সার্ভার সাড়া দেয়নি। তবুও বের হওয়া হচ্ছে।',
  'resume.done': 'আবার অনলাইন',
  'resume.failed': 'পুনরায় সংযোগ করা যায়নি',
  'resume.cancelled': 'পুনঃসংযোগ বাতিল হয়েছে',
} satisfies Partial<Record<keyof typeof en, string>>;
