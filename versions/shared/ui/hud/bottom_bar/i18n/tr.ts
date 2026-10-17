/** tr text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Eşya Mağazası',
  'bottomBar.characterInfo': 'Karakter Bilgisi',
  'bottomBar.inventory': 'Envanter',
  'bottomBar.friendList': 'Arkadaş Listesi',
  'bottomBar.noSkill': 'Yetenek yok (sağ tık = saldırı)',
  'bottomBar.emptySlot': '[{key}] boş',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' · tık: yetenek listesi, sağ tık: normal saldırı',
  'bottomBar.pickSkill': '[{key}] boş: yetenek seçmek için tıkla',
  'bottomBar.boundSlot': '{name} [{key}]: değiştirmek için sağ tıkla',
  'bottomBar.clearSlot': '[{key}] yuvasını boş bırak',
  'bottomBar.pet.normal': 'Nor',
  'bottomBar.pet.random': 'Rst',
  'bottomBar.pet.owner': 'Shp',
  'bottomBar.pet.target': 'Hdf',
  'bottomBar.pet.needTarget': 'Önce kuzgun için bir hedef seç',
  'exp.title': 'Deneyim',
  'bottomBar.menu': 'Menü',
} satisfies Partial<Record<keyof typeof en, string>>;
