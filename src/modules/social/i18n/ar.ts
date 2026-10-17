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
} satisfies Partial<Record<keyof typeof en, string>>;
