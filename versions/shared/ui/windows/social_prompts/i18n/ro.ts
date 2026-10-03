/** Romanian text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name} te invită în grup.',
  'social.guildJoin': '{name} cere să intre în breasla ta.',
  'social.guildWar': '{name} declară război breslei tale.',
  'social.battleSoccer': '{name} provoacă breasla ta la Battle Soccer.',
  'social.allianceOffer': '{name} îți oferă o alianță între bresle.',
  'social.allianceLeave': '{name} vrea să părăsească alianța.',
  'social.hostilityDeclare': '{name} declară breslele voastre ostile.',
  'social.hostilityEnd': '{name} vrea să pună capăt ostilității.',
  'social.friendRequest': '{name} vrea să te adauge ca prieten.',
} satisfies Partial<Record<keyof typeof en, string>>;
