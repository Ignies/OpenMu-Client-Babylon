/** fil text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'Naglo-load ng listahan ng server...',
  'servers.serverName': 'Server {number}',
  'login.id': 'ID',
  'login.password': 'Password',
  'options.title': 'Mga Setting',
  'options.texturePack': 'Texture ng modelo',
  'options.texturePack.original': 'Orihinal',
  'options.texturePackHint': 'Mas malinaw na texture ng modelo, inilalapat nang walang reload',
  'session.toLevel': 'Sa level',
  'bottomBar.pet.normalTip': 'Default: nananatili sa iyo ang uwak',
  'bottomBar.pet.randomTip': 'Random: inaatake ang anumang malapit',
  'bottomBar.pet.ownerTip': 'Amo: inaatake ang inaatake mo',
  'bottomBar.pet.targetTip': 'Target: inaatake ang kasalukuyan mong target',
  'skills.title': 'Mga Skill',
  'skills.empty': 'Walang natutunang skill',
  'chatRoom.leave': 'Umalis',
  'command.trade': 'Palitan',
  'command.purchase': 'Bumili',
  'command.party': 'Party',
  'command.whisper': 'Bulong',
  'command.follow': 'Sundan',
  'command.battle': 'Laban',
  'warp.title': 'Window ng Paglipat',
  'instrument.putAway': 'Itabi',
  'prompt.trade': 'Palitan',
} satisfies Partial<Record<keyof typeof en, string>>;
