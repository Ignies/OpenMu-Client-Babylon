/** fa text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped': 'این جهان ماژولی را فهرست کرده که خواندنی نیست ({id}): رد شد',
  'moduleStream.api':
    'ماژول {id} به API ماژول {range} نیاز دارد، این کلاینت {have} را ارائه می‌دهد: رد شد',
  'moduleStream.download': 'ماژول {id} دانلود نشد: رد شد',
  'moduleStream.hash': 'ماژول {id} با هش خود همخوان نیست: رد شد',
  'moduleStream.core': 'ماژول {id} ادعا می‌کند ماژول هسته است: پذیرفته نشد',
  'moduleStream.builtIn': 'ماژول {id} نام یک ماژول داخلی را دارد: پذیرفته نشد',
  'moduleStream.declined': 'ماژول {id} اجازه نیافت: رد شد',
  'moduleStream.failed': 'ماژول {id} اجرا نشد: بارگیری آن لغو شد',
} satisfies Partial<Record<keyof typeof en, string>>;
