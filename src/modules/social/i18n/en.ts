/** English text of the `social` module. See src/i18n/readme.md. */

const en = {
  'party.left': 'You have left the party.',
  'party.onlyLeaderInvites': 'Only the party leader can invite.',
  'party.full': 'The party is full.',
  'party.invitationSent': 'Party invitation sent to {name}.',
  'guild.joinRequestSent': 'Guild join request sent to {name}.',
  'guild.onlyMasterAppoints': 'Only the guild master can appoint members.',
  'guild.onlyMasterCan': 'Only the guild master can do that.',
  'guild.allianceRequestSent': 'Alliance request sent to {name}.',
  'guild.hostilityRequestSent': 'Hostility request sent to {name}.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/social': typeof en;
  }
}
