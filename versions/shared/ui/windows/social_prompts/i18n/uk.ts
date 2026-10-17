/** uk text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': 'Гравець {name} запрошує вас до групи.',
  'social.guildJoin': 'Гравець {name} хоче вступити до вашої гільдії.',
  'social.guildWar': '{name} оголошує війну вашій гільдії.',
  'social.battleSoccer': '{name} викликає вашу гільдію на Battle Soccer.',
  'social.allianceOffer': '{name} пропонує альянс гільдій.',
  'social.allianceLeave': '{name} хоче вийти з альянсу гільдій.',
  'social.hostilityDeclare': '{name} оголошує ворожнечу вашій гільдії.',
  'social.hostilityEnd': '{name} хоче припинити ворожнечу.',
  'social.friendRequest': 'Гравець {name} хоче додати вас у друзі.',
} satisfies Partial<Record<keyof typeof en, string>>;
