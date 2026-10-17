/** el text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': 'Ο παίκτης {name} σας προσκαλεί σε ομάδα.',
  'social.guildJoin': 'Ο παίκτης {name} ζητά να μπει στη συντεχνία σας.',
  'social.guildWar': 'Ο παίκτης {name} κηρύσσει πόλεμο στη συντεχνία σας.',
  'social.battleSoccer': 'Ο παίκτης {name} προκαλεί τη συντεχνία σας σε Battle Soccer.',
  'social.allianceOffer': 'Ο παίκτης {name} προτείνει συμμαχία συντεχνιών.',
  'social.allianceLeave': 'Ο παίκτης {name} θέλει να αποχωρήσει από τη συμμαχία συντεχνιών.',
  'social.hostilityDeclare': 'Ο παίκτης {name} κηρύσσει τις συντεχνίες σας εχθρικές.',
  'social.hostilityEnd': 'Ο παίκτης {name} θέλει να λήξει η εχθρότητα.',
  'social.friendRequest': 'Ο παίκτης {name} θέλει να σας προσθέσει στους φίλους.',
} satisfies Partial<Record<keyof typeof en, string>>;
