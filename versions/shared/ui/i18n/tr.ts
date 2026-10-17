/** tr text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'Sunucu listesi yükleniyor...',
  'servers.serverName': 'Sunucu {number}',
  'login.id': 'ID',
  'login.password': 'Şifre',
  'options.title': 'Ayarlar',
  'options.texturePack': 'Model dokuları',
  'options.texturePack.original': 'Orijinal',
  'options.texturePackHint':
    'Daha yüksek çözünürlüklü model dokuları, yeniden yüklemeden uygulanır',
  'session.toLevel': 'Seviyeye kalan',
  'bottomBar.pet.normalTip': 'Normal: kuzgun yanında kalır',
  'bottomBar.pet.randomTip': 'Rastgele: yakındaki her şeye saldırır',
  'bottomBar.pet.ownerTip': 'Sahip: senin saldırdığına saldırır',
  'bottomBar.pet.targetTip': 'Hedef: mevcut hedefine saldırır',
  'skills.title': 'Yetenekler',
  'skills.empty': 'Öğrenilmiş yetenek yok',
  'chatRoom.leave': 'Ayrıl',
  'command.trade': 'Takas',
  'command.purchase': 'Satın al',
  'command.party': 'Grup',
  'command.whisper': 'Fısıltı',
  'command.follow': 'Takip Et',
  'command.battle': 'Düello',
  'warp.title': 'Işınlanma Penceresi',
  'instrument.putAway': 'Kaldır',
  'prompt.trade': 'Takas',
} satisfies Partial<Record<keyof typeof en, string>>;
