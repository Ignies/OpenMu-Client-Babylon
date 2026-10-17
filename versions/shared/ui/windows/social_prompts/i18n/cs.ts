/** cs text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': 'Hráč {name} tě zve do družiny.',
  'social.guildJoin': 'Hráč {name} žádá o vstup do tvého cechu.',
  'social.guildWar': 'Cech {name} vyhlašuje válku tvému cechu.',
  'social.battleSoccer': 'Cech {name} vyzývá tvůj cech k Battle Soccer.',
  'social.allianceOffer': 'Hráč {name} nabízí alianci cechů.',
  'social.allianceLeave': 'Hráč {name} chce opustit alianci cechů.',
  'social.hostilityDeclare': 'Hráč {name} vyhlašuje nepřátelství mezi vašimi cechy.',
  'social.hostilityEnd': 'Hráč {name} chce ukončit nepřátelství.',
  'social.friendRequest': 'Hráč {name} si tě chce přidat do přátel.',
} satisfies Partial<Record<keyof typeof en, string>>;
