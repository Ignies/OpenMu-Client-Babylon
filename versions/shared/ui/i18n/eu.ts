/** eu text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'Zerbitzari-zerrenda kargatzen...',
  'servers.serverName': 'Zerbitzaria {number}',
  'login.id': 'ID',
  'login.password': 'Pasahitza',
  'options.title': 'Aukerak',
  'options.texturePack': 'Modeloen testurak',
  'options.texturePack.original': 'Jatorrizkoa',
  'options.texturePackHint':
    'Bereizmen handiagoko modelo-testurak, berriro kargatu gabe aplikatuak',
  'session.toLevel': 'Hurrengo mailara',
  'bottomBar.pet.normalTip': 'Lehenetsia: belea zurekin geratzen da',
  'bottomBar.pet.randomTip': 'Ausaz: gertu dagoen edozeri erasotzen dio',
  'bottomBar.pet.ownerTip': 'Jabea: zuk erasotzen duzunari erasotzen dio',
  'bottomBar.pet.targetTip': 'Helburua: zure uneko helburuari erasotzen dio',
  'skills.title': 'Trebetasunak',
  'skills.empty': 'Ez duzu trebetasunik ikasi',
  'chatRoom.leave': 'Irten',
  'command.trade': 'Trukatu',
  'command.purchase': 'Erosi',
  'command.party': 'Taldea',
  'command.whisper': 'Xuxurlatu',
  'command.follow': 'Jarraitu',
  'command.battle': 'Gudua',
  'warp.title': 'Teleportazio-leihoa',
  'instrument.putAway': 'Gorde',
  'prompt.trade': 'Trukea',
} satisfies Partial<Record<keyof typeof en, string>>;
