/** English text of the `guild` window. See src/i18n/readme.md. */

const en = {
  'guild.title': 'Guild',
  'guild.tab.info': 'Guild',
  'guild.tab.members': 'Members',
  'guild.tab.alliance': 'Alliance',
  'guild.notice': 'Notice',
  'guild.hostility': 'Hostility guild : {name}',
  'guild.hostilityShort': 'Hostility guild',
  'guild.war': 'Guild war',
  'guild.battleSoccer': 'Battle Soccer',
  'guild.disband': 'Disband',
  'guild.leave': 'Leave',
  'guild.position': 'Position',
  'guild.appointAssistant': 'Appoint as assistant guild master',
  'guild.dissolve': 'Dissolve',
  'guild.cannotAppoint': 'Can no longer be appointed',
  'guild.release': 'Release',
  'guild.kick': 'Kick {name}',
  'guild.selectedMember': 'the selected member',
  'guild.appointBattleMaster': 'Appoint as a battle master',
  'guild.noAlliance': 'Your guild is in no alliance.',
  'guild.allianceLeave': 'Withdraw guild alliance',
  'guild.allianceDisband': 'Disband guild alliance',
  'guild.found': 'Found a guild',
  'guild.markErase': 'Erase',
  'guild.markColour': 'Colour {index}',
  'guild.stat.guild': 'Guild : {name}',
  'guild.stat.score': 'Guild score: {score}',
  'guild.stat.membersMaster': 'Guild members {count}/{max}',
  'guild.stat.members': 'Guild member: {count}',
  'guild.noAnnouncement':
    'OpenMU sends no guild announcement; the box shows the running guild war instead.',
  'guild.col.name': 'Name',
  'guild.col.position': 'Position',
  'guild.col.server': 'Server',
  'guild.col.nameUpper': 'NAME',
  'guild.col.members': 'Members',
  'guild.nearbyMasters': 'Nearby guild masters',
  'guild.nearbyHint':
    'Stand next to another guild master to offer an alliance or declare hostility.',
  'guild.ally': 'Ally',
  'guild.rival': 'Rival',
  'guild.joinHint':
    'Stand next to the guild master you want to join and press Join, or talk to the Guild Master NPC to found one.',
  'guild.join': 'Join',
  'guild.nameScore': '{name} ( Score:{score} )',
  'guild.notInGuild': 'You are not in a guild.',
  'guild.foundQuestion': 'Do you want to found a guild?',
  'guild.foundCost': '(level 6 or above, 1 000 000 zen)',
  'guild.createName': 'Name',
  // GlobalText 427 / 428 / 1363-1366 / 1367: `CGuildBreakPasswordMsgBoxLayout`.
  'guild.leaveTitle': 'Leave the guild',
  'guild.breakHint': 'If you want to leave your guild,',
  'guild.kickHint': "To release character '{name}',",
  'guild.enterSecurityCode': 'please enter your account security code.',
  'guild.securityCode': 'Code',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/guild': typeof en;
  }
}
