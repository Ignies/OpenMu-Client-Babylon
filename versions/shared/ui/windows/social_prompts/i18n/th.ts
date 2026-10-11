/** Thai text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name} เชิญคุณเข้าปาร์ตี้',
  'social.guildJoin': '{name} ขอเข้าร่วมกิลด์ของคุณ',
  'social.guildWar': '{name} ประกาศสงครามกับกิลด์ของคุณ',
  'social.battleSoccer': '{name} ท้ากิลด์ของคุณแข่งแบทเทิลซอคเกอร์',
  'social.allianceOffer': '{name} เสนอเป็นพันธมิตรกิลด์',
  'social.allianceLeave': '{name} ต้องการออกจากพันธมิตรกิลด์',
  'social.hostilityDeclare': '{name} ประกาศให้กิลด์ของคุณเป็นศัตรู',
  'social.hostilityEnd': '{name} ต้องการยุติความเป็นศัตรู',
  'social.friendRequest': '{name} ต้องการเพิ่มคุณเป็นเพื่อน',
} satisfies Partial<Record<keyof typeof en, string>>;
