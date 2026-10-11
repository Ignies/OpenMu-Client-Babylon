/** Bulgarian text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name} те кани в група.',
  'social.guildJoin': '{name} иска да влезе в гилдията ти.',
  'social.guildWar': '{name} обявява война на гилдията ти.',
  'social.battleSoccer': '{name} предизвиква гилдията ти на Battle Soccer.',
  'social.allianceOffer': '{name} предлага съюз на гилдиите.',
  'social.allianceLeave': '{name} иска да напусне съюза.',
  'social.hostilityDeclare': '{name} обявява гилдиите ви за вражески.',
  'social.hostilityEnd': '{name} иска да прекрати враждата.',
  'social.friendRequest': '{name} иска да те добави за приятел.',
} satisfies Partial<Record<keyof typeof en, string>>;
