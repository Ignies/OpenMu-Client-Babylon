/** ur text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped': 'یہ دنیا ایک ماڈیول دکھاتی ہے جو پڑھا نہیں جا سکتا ({id}): چھوڑ دیا گیا',
  'moduleStream.api':
    'ماڈیول {id} کو ماڈیول API {range} چاہیے، یہ کلائنٹ {have} دیتا ہے: چھوڑ دیا گیا',
  'moduleStream.download': 'ماڈیول {id} ڈاؤن لوڈ نہ ہو سکا: چھوڑ دیا گیا',
  'moduleStream.hash': 'ماڈیول {id} اپنے ہیش سے میل نہیں کھاتا: چھوڑ دیا گیا',
  'moduleStream.core': 'ماڈیول {id} بنیادی ماڈیول ہونے کا دعویٰ کرتا ہے: مسترد',
  'moduleStream.builtIn': 'ماڈیول {id} کا نام ایک اندرونی ماڈیول کا ہے: مسترد',
  'moduleStream.declined': 'ماڈیول {id} کو اجازت نہیں ملی: چھوڑ دیا گیا',
  'moduleStream.failed': 'ماڈیول {id} شروع نہ ہو سکا: ہٹا دیا گیا',
} satisfies Partial<Record<keyof typeof en, string>>;
