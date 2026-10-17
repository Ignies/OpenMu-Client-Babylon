/** tr text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} adlı oyuncu loncadan ayrıldı.',
  'guild.youLeft': 'Loncadan ayrıldın.',
  'guild.disbanded': 'Lonca dağıtıldı.',
  'guild.memberRemoved': 'Üye loncadan çıkarıldı.',
  'guild.onlyMasterRemoves': 'Üyeleri yalnızca lonca lideri çıkarabilir.',
  'guild.wrongPassword': 'Girdiğin şifre yanlış.',
  'guild.created': 'Lonca kuruldu.',
  'guild.nameTaken': 'Bu lonca adı zaten alınmış.',
  'guild.createFailed': 'Lonca kurulamadı.',
  'guild.joinRefused': 'Lonca lideri isteğini reddetti.',
  'guild.joined': 'Loncaya katıldın.',
  'guild.isFull': 'Lonca dolu.',
  'guild.masterUnavailable': 'Lonca liderine ulaşılamıyor.',
  'guild.masterBusy': 'Lonca lideri meşgul. Daha sonra yeniden dene.',
  'guild.needLevel6': 'Bir loncaya katılmak için en az seviye 6 olmalısın.',
} satisfies Partial<Record<keyof typeof en, string>>;
