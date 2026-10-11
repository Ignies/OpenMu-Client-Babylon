/** English text of the `guild_war` module. See src/i18n/readme.md. */

const en = {
  'guild.warNotFound': 'That guild does not exist.',
  'guild.warRequestSent': 'The war request was sent to the guild master.',
  'guild.warMasterOffline': 'That guild master is not online.',
  'guild.warNotInGuild': 'You do not belong to a guild.',
  'guild.warRequestFailed': 'The war request failed.',
  'guild.warOnlyMaster': 'Only the guild master can declare a war.',
  'guild.warAlready': 'Your guild is already at war.',
  'guild.soccerStarted': 'Battle Soccer against {name} has started.',
  'guild.warStarted': 'Guild war against {name} has started.',
  'guild.warWon': 'Your guild has won the war.',
  'guild.warLost': 'Your guild has lost the war.',
  'guild.warCancelled': 'The guild war was cancelled.',
  'guild.warCancelledByOther': 'The other guild master cancelled the war.',
  'guild.warEnded': 'The guild war has ended.',
  'guild.relFailed': 'Failed',
  'guild.relNotFound': 'That guild does not exist.',
  'guild.relNoAuthorization': 'You are not allowed to do that.',
  'guild.relAlreadyAlliance': 'Already belongs to guild alliance',
  'guild.relAlreadyHostile': 'The two guilds are already hostile.',
  'guild.relAllianceExists': 'That guild already has an alliance.',
  'guild.relHostileExists': 'That guild is already hostile to someone.',
  'guild.relNoAlliance': 'There is no alliance to leave.',
  'guild.relNoHostility': 'There is no hostility to end.',
  'guild.relNotAllianceMaster': 'Not a master of guild alliance',
  'guild.relNotRival': 'That guild is not your rival.',
  'guild.relIncomplete':
    'Incomplete requirements for creating a guild alliance',
  'guild.relAllianceFull': 'The alliance is full.',
  'guild.relCancelled': 'The request was cancelled.',
  'guild.allianceFormed': 'The guild alliance was formed.',
  'guild.allianceDissolved': 'The guild alliance was dissolved.',
  'guild.nowHostile': 'The guilds are now hostile.',
  'guild.hostilityEnded': 'The hostility has ended.',
  'guild.allianceRemoved': 'The guild was removed from the alliance.',
  'guild.allianceRemoveFailed':
    'That guild could not be removed from the alliance.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/guild_war': typeof en;
  }
}
