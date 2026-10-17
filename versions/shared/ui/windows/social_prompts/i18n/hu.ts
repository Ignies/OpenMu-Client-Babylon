/** hu text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': '{name} meghív téged egy csapatba.',
  'social.guildJoin': '{name} csatlakozni szeretne a céhedhez.',
  'social.guildWar': '{name} hadat üzen a céhednek.',
  'social.battleSoccer': '{name} Battle Soccer mérkőzésre hívja a céhedet.',
  'social.allianceOffer': '{name} céhszövetséget ajánl.',
  'social.allianceLeave': '{name} ki szeretne lépni a céhszövetségből.',
  'social.hostilityDeclare': '{name} ellenségesnek nyilvánítja a céheiteket.',
  'social.hostilityEnd': '{name} véget vetne az ellenségeskedésnek.',
  'social.friendRequest': '{name} fel szeretne venni a barátai közé.',
} satisfies Partial<Record<keyof typeof en, string>>;
