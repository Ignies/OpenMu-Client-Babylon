/** Vietnamese text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name} mời bạn vào tổ đội.',
  'social.guildJoin': '{name} xin gia nhập bang hội của bạn.',
  'social.guildWar': '{name} tuyên chiến với bang hội của bạn.',
  'social.battleSoccer': '{name} thách đấu bang hội của bạn trong Battle Soccer.',
  'social.allianceOffer': '{name} đề nghị liên minh bang hội.',
  'social.allianceLeave': '{name} muốn rời liên minh bang hội.',
  'social.hostilityDeclare': '{name} tuyên bố bang hội hai bên là thù địch.',
  'social.hostilityEnd': '{name} muốn chấm dứt thù địch.',
  'social.friendRequest': '{name} muốn kết bạn với bạn.',
} satisfies Partial<Record<keyof typeof en, string>>;
