/** English text of the `guild` module. See src/i18n/readme.md. */

const en = {
  'guild.memberLeft': '{name} left the guild.',
  'guild.youLeft': 'You have left the guild.',
  'guild.disbanded': 'The guild has been disbanded.',
  'guild.memberRemoved': 'The member was removed from the guild.',
  'guild.onlyMasterRemoves': 'Only the guild master can remove members.',
  'guild.wrongPassword': 'The password you have entered is incorrect.',
  'guild.created': 'The guild has been created.',
  'guild.nameTaken': 'That guild name is already taken.',
  'guild.createFailed': 'The guild could not be created.',
  'guild.joinRefused': 'The guild master refused your request.',
  'guild.joined': 'You have joined the guild.',
  'guild.isFull': 'The guild is full.',
  'guild.masterUnavailable': 'The guild master is not available.',
  'guild.masterBusy': 'The guild master is busy. Try again later.',
  'guild.needLevel6': 'You must be at least level 6 to join a guild.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/guild': typeof en;
  }
}
