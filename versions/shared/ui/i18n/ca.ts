/** ca text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'S\'està carregant la llista de servidors...',
  'servers.serverName': 'Servidor {number}',
  'login.id': 'ID',
  'login.password': 'Contrasenya',
  'options.title': 'Opcions',
  'options.texturePack': 'Textures dels models',
  'options.texturePack.original': 'Originals',
  'options.texturePackHint': 'Textures dels models de més resolució, s\'apliquen sense recarregar',
  'session.toLevel': 'Proper nivell',
  'bottomBar.pet.normalTip': 'Per defecte: el corb es queda amb tu',
  'bottomBar.pet.randomTip': 'A l\'atzar: ataca qualsevol cosa propera',
  'bottomBar.pet.ownerTip': 'Amo: ataca el que ataques tu',
  'bottomBar.pet.targetTip': 'Objectiu: ataca el teu objectiu actual',
  'skills.title': 'Habilitats',
  'skills.empty': 'No has après cap habilitat',
  'chatRoom.leave': 'Surt',
  'command.trade': 'Intercanvia',
  'command.purchase': 'Compra',
  'command.party': 'Grup',
  'command.whisper': 'Xiuxiueja',
  'command.follow': 'Segueix',
  'command.battle': 'Combat',
  'warp.title': 'Finestra de teletransport',
  'instrument.putAway': 'Guarda',
  'prompt.trade': 'Intercanvi',
} satisfies Partial<Record<keyof typeof en, string>>;
