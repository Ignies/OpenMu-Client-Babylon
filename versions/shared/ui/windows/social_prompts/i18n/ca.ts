/** ca text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': 'El jugador {name} et convida a un grup.',
  'social.guildJoin': 'El jugador {name} demana entrar al teu gremi.',
  'social.guildWar': 'El gremi {name} declara la guerra al teu gremi.',
  'social.battleSoccer': 'El gremi {name} desafia el teu gremi a un Battle Soccer.',
  'social.allianceOffer': 'El jugador {name} ofereix una aliança de gremis.',
  'social.allianceLeave': 'El jugador {name} vol abandonar l\'aliança de gremis.',
  'social.hostilityDeclare': 'El jugador {name} declara hostils els vostres gremis.',
  'social.hostilityEnd': 'El jugador {name} vol posar fi a l\'hostilitat.',
  'social.friendRequest': 'El jugador {name} et vol afegir a la seva llista d\'amics.',
} satisfies Partial<Record<keyof typeof en, string>>;
