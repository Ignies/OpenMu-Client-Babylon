/** English text of the `social_prompts` window. See src/i18n/readme.md. */

const en = {
  'social.partyInvite': '{name} invites you to a party.',
  'social.guildJoin': '{name} asks to join your guild.',
  'social.guildWar': '{name} declares war on your guild.',
  'social.battleSoccer': '{name} challenges your guild to Battle Soccer.',
  'social.allianceOffer': '{name} offers a guild alliance.',
  'social.allianceLeave': '{name} wants to leave the guild alliance.',
  'social.hostilityDeclare': '{name} declares your guilds hostile.',
  'social.hostilityEnd': '{name} wants to end the hostility.',
  'social.friendRequest': '{name} wants to add you as a friend.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/social_prompts': typeof en;
  }
}
