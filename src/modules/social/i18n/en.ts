/** English text of the `social` module. See src/i18n/readme.md. */

const en = {
  'party.left': 'You have left the party.',
  'party.onlyLeaderInvites': 'Only the party leader can invite.',
  'party.full': 'The party is full.',
  'party.invitationSent': 'Party invitation sent to {name}.',
  /** `/re on|off|auto` (ours): how party invitations are answered. */
  'party.reply.on': 'Party invitations: you will be asked.',
  'party.reply.off': 'Party invitations: declined on their own. /re on to be asked again.',
  'party.reply.auto': 'Party invitations: accepted on their own. /re on to be asked again.',
  'party.reply.status': 'Party invitations: /re {mode}. Use /re on, /re off or /re auto.',
  'party.reply.declined': 'Party invitation from {name} declined (/re).',
  'party.reply.accepted': 'Party invitation from {name} accepted (/re).',
  'guild.joinRequestSent': 'Guild join request sent to {name}.',
  'guild.onlyMasterAppoints': 'Only the guild master can appoint members.',
  'guild.onlyMasterCan': 'Only the guild master can do that.',
  'guild.allianceRequestSent': 'Alliance request sent to {name}.',
  'guild.hostilityRequestSent': 'Hostility request sent to {name}.',
  'stats.added': '{amount} points added to {stat}.',
  'stats.name.str': 'Strength',
  'stats.name.agi': 'Agility',
  'stats.name.vit': 'Vitality',
  'stats.name.ene': 'Energy',
  'stats.name.cmd': 'Command',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/social': typeof en;
  }
}
