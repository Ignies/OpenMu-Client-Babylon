/** ar text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'غادرت الفريق.',
  'party.onlyLeaderInvites': 'قائد الفريق وحده يستطيع الدعوة.',
  'party.full': 'الفريق ممتلئ.',
  'party.invitationSent': 'تم إرسال دعوة الفريق إلى اللاعب {name}.',
  'guild.joinRequestSent': 'تم إرسال طلب الانضمام إلى النقابة إلى اللاعب {name}.',
  'guild.onlyMasterAppoints': 'سيد النقابة وحده يستطيع تعيين الأعضاء.',
  'guild.onlyMasterCan': 'سيد النقابة وحده يستطيع فعل ذلك.',
  'guild.allianceRequestSent': 'تم إرسال طلب التحالف إلى اللاعب {name}.',
  'guild.hostilityRequestSent': 'تم إرسال إعلان العداء إلى اللاعب {name}.',
  'party.reply.on': 'دعوات الفريق: سيتم سؤالك.',
  'party.reply.off': 'دعوات الفريق: ترفض تلقائيا. اكتب /re on ليتم سؤالك مجددا.',
  'party.reply.auto': 'دعوات الفريق: تقبل تلقائيا. اكتب /re on ليتم سؤالك مجددا.',
  'party.reply.status': 'دعوات الفريق: /re {mode}. استخدم /re on أو /re off أو /re auto.',
  'party.reply.declined': 'تم رفض دعوة الفريق من اللاعب {name} (/re).',
  'party.reply.accepted': 'تم قبول دعوة الفريق من اللاعب {name} (/re).',
} satisfies Partial<Record<keyof typeof en, string>>;
