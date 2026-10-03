/** Portuguese text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name} convida você para o grupo.',
  'social.guildJoin': '{name} quer entrar na sua guilda.',
  'social.guildWar': '{name} declara guerra à sua guilda.',
  'social.battleSoccer': '{name} desafia sua guilda para o Battle Soccer.',
  'social.allianceOffer': '{name} oferece uma aliança de guildas.',
  'social.allianceLeave': '{name} quer sair da aliança.',
  'social.hostilityDeclare': '{name} declara as guildas hostis.',
  'social.hostilityEnd': '{name} quer encerrar a hostilidade.',
  'social.friendRequest': '{name} quer adicionar você como amigo.',
} satisfies Partial<Record<keyof typeof en, string>>;
