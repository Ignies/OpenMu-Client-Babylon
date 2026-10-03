/** Russian text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name} приглашает вас в группу.',
  'social.guildJoin': '{name} просится в вашу гильдию.',
  'social.guildWar': '{name} объявляет войну вашей гильдии.',
  'social.battleSoccer': '{name} вызывает вашу гильдию на Battle Soccer.',
  'social.allianceOffer': '{name} предлагает союз гильдий.',
  'social.allianceLeave': '{name} хочет выйти из союза гильдий.',
  'social.hostilityDeclare': '{name} объявляет ваши гильдии враждебными.',
  'social.hostilityEnd': '{name} хочет прекратить вражду.',
  'social.friendRequest': '{name} хочет добавить вас в друзья.',
} satisfies Partial<Record<keyof typeof en, string>>;
