/** hu text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Tárgybolt',
  'bottomBar.characterInfo': 'Karakteradatok',
  'bottomBar.inventory': 'Leltár',
  'bottomBar.friendList': 'Barátlista',
  'bottomBar.noSkill': 'Nincs képesség (jobb egérgomb = támadás)',
  'bottomBar.emptySlot': '[{key}] üres',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - kattintás: képességlista, jobb egérgomb: sima támadás',
  'bottomBar.pickSkill': '[{key}] üres - kattints egy képesség kiválasztásához',
  'bottomBar.boundSlot': '{name} [{key}] - módosítás jobb egérgombbal',
  'bottomBar.clearSlot': 'Hely üresen hagyása: [{key}]',
  'bottomBar.pet.normal': 'Alap',
  'bottomBar.pet.random': 'Vél',
  'bottomBar.pet.owner': 'Gazda',
  'bottomBar.pet.target': 'Cél',
  'bottomBar.pet.needTarget': 'Előbb jelölj ki célpontot a hollónak',
  'exp.title': 'Tapasztalat',
  'bottomBar.menu': 'Menü',
} satisfies Partial<Record<keyof typeof en, string>>;
