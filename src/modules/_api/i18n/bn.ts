/** bn text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped':
    'এই ওয়ার্ল্ডের তালিকায় এমন মডিউল আছে যা পড়া যায় না ({id}): বাদ দেওয়া হয়েছে',
  'moduleStream.api':
    'মডিউল {id}: দরকার মডিউল API {range}, এই ক্লায়েন্ট দেয় {have}: বাদ দেওয়া হয়েছে',
  'moduleStream.download': 'মডিউল {id} ডাউনলোড করা যায়নি: বাদ দেওয়া হয়েছে',
  'moduleStream.hash': 'মডিউল {id} তার হ্যাশের সাথে মেলে না: বাদ দেওয়া হয়েছে',
  'moduleStream.core': 'মডিউল {id} নিজেকে কোর মডিউল দাবি করে: প্রত্যাখ্যাত',
  'moduleStream.builtIn': 'মডিউল {id}: নামটি একটি অন্তর্নির্মিত মডিউলের: প্রত্যাখ্যাত',
  'moduleStream.declined': 'মডিউল {id} অনুমতি পায়নি: বাদ দেওয়া হয়েছে',
  'moduleStream.failed': 'মডিউল {id} চালু হতে পারেনি: আনলোড করা হয়েছে',
} satisfies Partial<Record<keyof typeof en, string>>;
