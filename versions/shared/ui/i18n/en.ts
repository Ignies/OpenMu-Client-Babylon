/** English text of several windows, HUD elements and pages (no single owner). See src/i18n/readme.md. */

const en = {
  'servers.loading': 'Loading server list...',
  'servers.serverName': 'Server {number}',
  'login.id': 'ID',
  'login.password': 'Password',

  'options.title': 'Option',
  'options.texturePack': 'Model textures',
  'options.texturePack.original': 'Original',
  'options.texturePackHint': 'Higher-resolution model textures, applied without reloading',
  'session.toLevel': 'To level',
  'bottomBar.pet.normalTip': 'Default: the raven stays with you',
  'bottomBar.pet.randomTip': 'Random: attacks anything near',
  'bottomBar.pet.ownerTip': 'Owner: attacks what you attack',
  'bottomBar.pet.targetTip': 'Target: attacks your current target',

  'skills.title': 'Skills',
  'skills.empty': 'No skills learned',
  'chatRoom.leave': 'Leave',
  'command.trade': 'Trade',
  'command.purchase': 'Purchase',
  'command.party': 'Party',
  'command.whisper': 'Whisper',
  'command.follow': 'Follow',
  'command.battle': 'Battle',
  'warp.title': 'Warp Command Window',
  'instrument.putAway': 'Put away',
  'prompt.trade': 'Trade',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui': typeof en;
  }
}
