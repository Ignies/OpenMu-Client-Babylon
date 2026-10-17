/** tr text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': '{name} adlı oyuncu seni gruba davet ediyor.',
  'social.guildJoin': '{name} adlı oyuncu loncana katılmak istiyor.',
  'social.guildWar': '{name} adlı oyuncu loncana savaş ilan ediyor.',
  'social.battleSoccer': '{name} adlı oyuncu loncanı Battle Soccer maçına davet ediyor.',
  'social.allianceOffer': '{name} adlı oyuncu lonca ittifakı öneriyor.',
  'social.allianceLeave': '{name} adlı oyuncu lonca ittifakından ayrılmak istiyor.',
  'social.hostilityDeclare': '{name} adlı oyuncu iki loncayı düşman ilan ediyor.',
  'social.hostilityEnd': '{name} adlı oyuncu düşmanlığı sona erdirmek istiyor.',
  'social.friendRequest': '{name} adlı oyuncu seni arkadaş olarak eklemek istiyor.',
} satisfies Partial<Record<keyof typeof en, string>>;
