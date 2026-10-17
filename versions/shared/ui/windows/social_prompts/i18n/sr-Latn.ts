/** sr-Latn text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': 'Igrač {name} te poziva u grupu.',
  'social.guildJoin': 'Igrač {name} traži da se pridruži tvojoj gildi.',
  'social.guildWar': 'Igrač {name} objavljuje rat tvojoj gildi.',
  'social.battleSoccer': 'Igrač {name} izaziva tvoju gildu na Battle Soccer.',
  'social.allianceOffer': 'Igrač {name} nudi savez gilda.',
  'social.allianceLeave': 'Igrač {name} želi da napusti savez gilda.',
  'social.hostilityDeclare': 'Igrač {name} proglašava vaše gilde neprijateljima.',
  'social.hostilityEnd': 'Igrač {name} želi da okonča neprijateljstvo.',
  'social.friendRequest': 'Igrač {name} želi da te doda za prijatelja.',
} satisfies Partial<Record<keyof typeof en, string>>;
