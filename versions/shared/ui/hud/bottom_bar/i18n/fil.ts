/** fil text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Item Shop',
  'bottomBar.characterInfo': 'Impormasyon ng Karakter',
  'bottomBar.inventory': 'Imbentaryo',
  'bottomBar.friendList': 'Listahan ng Kaibigan',
  'bottomBar.menu': 'Menu',
  'bottomBar.noSkill': 'Walang skill (right click = atake)',
  'bottomBar.emptySlot': '[{key}] bakante',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - click: listahan ng skill, right click: karaniwang atake',
  'bottomBar.pickSkill': '[{key}] bakante - i-click para pumili ng skill',
  'bottomBar.boundSlot': '{name} [{key}] - right click para palitan',
  'bottomBar.clearSlot': 'Iwanang bakante ang slot [{key}]',
  'bottomBar.pet.normal': 'Nor',
  'bottomBar.pet.random': 'Rnd',
  'bottomBar.pet.owner': 'Amo',
  'bottomBar.pet.target': 'Trg',
  'bottomBar.pet.needTarget': 'Pumili muna ng target para sa uwak',
  'exp.title': 'EXP',
} satisfies Partial<Record<keyof typeof en, string>>;
