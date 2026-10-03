/** Italian text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name} ti invita nel suo gruppo.',
  'social.guildJoin': '{name} chiede di entrare nella tua gilda.',
  'social.guildWar': '{name} dichiara guerra alla tua gilda.',
  'social.battleSoccer': '{name} sfida la tua gilda a Battle Soccer.',
  'social.allianceOffer': '{name} propone un’alleanza tra gilde.',
  'social.allianceLeave': '{name} vuole lasciare l’alleanza.',
  'social.hostilityDeclare': '{name} dichiara ostili le vostre gilde.',
  'social.hostilityEnd': '{name} vuole porre fine all’ostilità.',
  'social.friendRequest': '{name} vuole aggiungerti tra gli amici.',
} satisfies Partial<Record<keyof typeof en, string>>;
