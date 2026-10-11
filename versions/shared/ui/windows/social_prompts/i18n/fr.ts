/** French text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name} vous invite dans son groupe.',
  'social.guildJoin': '{name} demande à rejoindre votre guilde.',
  'social.guildWar': '{name} déclare la guerre à votre guilde.',
  'social.battleSoccer': '{name} défie votre guilde en Battle Soccer.',
  'social.allianceOffer': '{name} propose une alliance de guildes.',
  'social.allianceLeave': '{name} veut quitter l’alliance.',
  'social.hostilityDeclare': '{name} déclare vos guildes hostiles.',
  'social.hostilityEnd': '{name} veut mettre fin à l’hostilité.',
  'social.friendRequest': '{name} veut vous ajouter comme ami.',
} satisfies Partial<Record<keyof typeof en, string>>;
