/** ar text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': 'يدعوك اللاعب {name} إلى فريق.',
  'social.guildJoin': 'يطلب اللاعب {name} الانضمام إلى نقابتك.',
  'social.guildWar': 'يعلن اللاعب {name} الحرب على نقابتك.',
  'social.battleSoccer': 'يتحدى اللاعب {name} نقابتك في Battle Soccer.',
  'social.allianceOffer': 'يعرض اللاعب {name} تحالفا بين النقابات.',
  'social.allianceLeave': 'يريد اللاعب {name} مغادرة تحالف النقابات.',
  'social.hostilityDeclare': 'يعلن اللاعب {name} العداء بين نقابتيكما.',
  'social.hostilityEnd': 'يريد اللاعب {name} إنهاء العداء.',
  'social.friendRequest': 'يريد اللاعب {name} إضافتك صديقا.',
} satisfies Partial<Record<keyof typeof en, string>>;
