/** eu text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': '{name} jokalariak taldera gonbidatzen zaitu.',
  'social.guildJoin': '{name} jokalariak zure gremioan sartzeko eskatzen du.',
  'social.guildWar': '{name} jokalariak gerra deklaratu dio zure gremioari.',
  'social.battleSoccer': '{name} jokalariak Battle Soccer partidara desafiatzen du zure gremioa.',
  'social.allianceOffer': '{name} jokalariak gremio-aliantza bat eskaintzen du.',
  'social.allianceLeave': '{name} jokalariak gremio-aliantza utzi nahi du.',
  'social.hostilityDeclare': '{name} jokalariak etsaitasuna adierazi dio zure gremioari.',
  'social.hostilityEnd': '{name} jokalariak etsaitasuna amaitu nahi du.',
  'social.friendRequest': '{name} jokalariak lagun gisa gehitu nahi zaitu.',
} satisfies Partial<Record<keyof typeof en, string>>;
