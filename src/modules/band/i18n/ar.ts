/** ar text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'غيتار',
  'instrument.flute': 'فلوت',
  'instrument.ocarina': 'أوكارينا',
  'instrument.harp': 'قيثارة',
  'instrument.drums': 'طبول',
  'instrument.you': 'أنت',
  'instrument.startsPlaying': 'بدأ اللاعب {name} العزف على {instrument}',
  'instrument.stopsPlaying': 'توقف اللاعب {name} عن العزف',
  'instrument.joinsBand': 'انضم اللاعب {name} إلى فرقة اللاعب {master}',
  'instrument.leavesBand': 'غادر اللاعب {name} الفرقة',
  'instrument.fileError': 'هذا الملف ليس ملف MIDI يستطيع هذا العميل تشغيله',
  'instrument.unavailable': 'الآلات الموسيقية غير متاحة على هذا الخادم',
  'instrument.stopped.flood': 'تم إيقاف عزفك: نوتات كثيرة جدا في وقت واحد',
  'instrument.stopped.order': 'تم إيقاف عزفك: وصلت النوتات بترتيب خاطئ',
  'instrument.stopped.gone': 'غادر العازف',
  'instrument.refused.cooldown': 'يمكنك العزف مجددا بعد {seconds} ث',
  'instrument.refused.busy': 'أنت تعزف بالفعل أو في فرقة',
  'instrument.refused.full': 'عدد العازفين هنا كبير جدا حاليا',
  'instrument.refused.range': 'أنت بعيد جدا عن العازف',
  'instrument.refused.map': 'العازف في خريطة أخرى',
  'instrument.refused.notPerforming': 'هذا اللاعب لا يعزف',
  'instrument.refused.rate': 'تمهّل',
} satisfies Partial<Record<keyof typeof en, string>>;
