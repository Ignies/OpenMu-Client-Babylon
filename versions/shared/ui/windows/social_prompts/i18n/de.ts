/** German text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name} lädt dich in eine Gruppe ein.',
  'social.guildJoin': '{name} möchte deiner Gilde beitreten.',
  'social.guildWar': '{name} erklärt deiner Gilde den Krieg.',
  'social.battleSoccer': '{name} fordert deine Gilde zu Battle Soccer heraus.',
  'social.allianceOffer': '{name} bietet eine Gildenallianz an.',
  'social.allianceLeave': '{name} möchte die Gildenallianz verlassen.',
  'social.hostilityDeclare': '{name} erklärt eure Gilden zu Feinden.',
  'social.hostilityEnd': '{name} möchte die Feindschaft beenden.',
  'social.friendRequest': '{name} möchte dich als Freund hinzufügen.',
} satisfies Partial<Record<keyof typeof en, string>>;
