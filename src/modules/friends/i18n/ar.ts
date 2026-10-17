/** ar text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'لا يمكنك إضافة نفسك كصديق.',
  'friends.alreadyOnList': 'اللاعب {name} موجود بالفعل في قائمة أصدقائك.',
  'friends.listFull': 'قائمة أصدقائك ممتلئة.',
  'friends.requestSent': 'تم إرسال طلب الصداقة إلى اللاعب {name}.',
  'friends.requestFailed': 'تعذر إرسال طلب الصداقة.',
  'friends.added': 'تمت إضافة اللاعب {name} إلى قائمة أصدقائك.',
  'friends.cannotLetterSelf': 'لا يمكنك إرسال رسالة إلى نفسك.',
  'friends.letterArrived': 'وصلت رسالة من اللاعب {name}.',
  'friends.letterDeleteFailed': 'تعذر حذف الرسالة.',
  'friends.letterSent': 'تم إرسال الرسالة.',
  'friends.letterTryAgain': 'تعذر إرسال الرسالة. حاول مجددا.',
  'friends.mailboxFull': 'صندوق البريد هذا ممتلئ.',
  'friends.noSuchCharacter': 'لا توجد شخصية بهذا الاسم.',
  'friends.letterNeedsZen': 'لا تملك ما يكفي من Zen لإرسال رسالة.',
  'friends.letterFailed': 'تعذر إرسال الرسالة.',
} satisfies Partial<Record<keyof typeof en, string>>;
