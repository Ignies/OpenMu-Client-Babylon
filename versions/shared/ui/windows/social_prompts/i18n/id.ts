/** id text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': '{name} mengundangmu ke party.',
  'social.guildJoin': '{name} meminta bergabung dengan guildmu.',
  'social.guildWar': '{name} menyatakan perang terhadap guildmu.',
  'social.battleSoccer': '{name} menantang guildmu bermain Battle Soccer.',
  'social.allianceOffer': '{name} menawarkan aliansi guild.',
  'social.allianceLeave': '{name} ingin keluar dari aliansi guild.',
  'social.hostilityDeclare': '{name} menyatakan permusuhan antara guild kalian.',
  'social.hostilityEnd': '{name} ingin mengakhiri permusuhan.',
  'social.friendRequest': '{name} ingin menambahkanmu sebagai teman.',
} satisfies Partial<Record<keyof typeof en, string>>;
