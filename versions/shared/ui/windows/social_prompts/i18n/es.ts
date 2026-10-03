/** Spanish text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name} te invita a su grupo.',
  'social.guildJoin': '{name} quiere entrar en tu gremio.',
  'social.guildWar': '{name} declara la guerra a tu gremio.',
  'social.battleSoccer': '{name} reta a tu gremio a Battle Soccer.',
  'social.allianceOffer': '{name} te ofrece una alianza de gremios.',
  'social.allianceLeave': '{name} quiere salir de la alianza.',
  'social.hostilityDeclare': '{name} declara hostiles a vuestros gremios.',
  'social.hostilityEnd': '{name} quiere acabar con la hostilidad.',
  'social.friendRequest': '{name} quiere añadirte como amigo.',
} satisfies Partial<Record<keyof typeof en, string>>;
