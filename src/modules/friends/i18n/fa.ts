/** fa text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'نمی‌توانید خودتان را به دوستی بیفزایید.',
  'friends.alreadyOnList': 'بازیکن {name} هم‌اکنون در فهرست دوستان شما است.',
  'friends.listFull': 'فهرست دوستان شما پر است.',
  'friends.requestSent': 'درخواست دوستی برای بازیکن {name} فرستاده شد.',
  'friends.requestFailed': 'درخواست دوستی فرستاده نشد.',
  'friends.added': 'بازیکن {name} به فهرست دوستان شما افزوده شد.',
  'friends.cannotLetterSelf': 'نمی‌توانید به خودتان نامه بفرستید.',
  'friends.letterArrived': 'نامه‌ای از بازیکن {name} رسید.',
  'friends.letterDeleteFailed': 'نامه حذف نشد.',
  'friends.letterSent': 'نامه فرستاده شد.',
  'friends.letterTryAgain': 'نامه فرستاده نشد. دوباره بکوشید.',
  'friends.mailboxFull': 'آن صندوق نامه پر است.',
  'friends.noSuchCharacter': 'کاراکتری با این نام وجود ندارد.',
  'friends.letterNeedsZen': 'Zen کافی برای فرستادن نامه ندارید.',
  'friends.letterFailed': 'نامه فرستاده نشد.',
} satisfies Partial<Record<keyof typeof en, string>>;
