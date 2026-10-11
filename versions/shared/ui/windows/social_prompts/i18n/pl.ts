/** Polish text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name} zaprasza cię do drużyny.',
  'social.guildJoin': '{name} prosi o dołączenie do twojej gildii.',
  'social.guildWar': '{name} wypowiada wojnę twojej gildii.',
  'social.battleSoccer': '{name} wyzywa twoją gildię na Battle Soccer.',
  'social.allianceOffer': '{name} proponuje sojusz gildii.',
  'social.allianceLeave': '{name} chce opuścić sojusz gildii.',
  'social.hostilityDeclare': '{name} ogłasza wrogość między waszymi gildiami.',
  'social.hostilityEnd': '{name} chce zakończyć wrogość.',
  'social.friendRequest': '{name} chce dodać cię do znajomych.',
} satisfies Partial<Record<keyof typeof en, string>>;
