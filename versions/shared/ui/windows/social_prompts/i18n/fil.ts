/** fil text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': 'Iniimbitahan ka ni {name} sa isang party.',
  'social.guildJoin': 'Humihiling si {name} na sumali sa iyong guild.',
  'social.guildWar': 'Nagdeklara si {name} ng digmaan laban sa iyong guild.',
  'social.battleSoccer': 'Hinahamon ni {name} ang iyong guild sa Battle Soccer.',
  'social.allianceOffer': 'Nag-aalok si {name} ng alyansa ng guild.',
  'social.allianceLeave': 'Gustong umalis ni {name} sa alyansa ng guild.',
  'social.hostilityDeclare':
    'Idineklara ni {name} na magkalaban ang kanyang guild at ang iyong guild.',
  'social.hostilityEnd': 'Gustong wakasan ni {name} ang pagkakalaban.',
  'social.friendRequest': 'Gusto kang idagdag ni {name} bilang kaibigan.',
} satisfies Partial<Record<keyof typeof en, string>>;
