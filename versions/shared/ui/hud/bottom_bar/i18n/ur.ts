/** ur text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'آئٹم شاپ',
  'bottomBar.characterInfo': 'کردار کی معلومات',
  'bottomBar.inventory': 'سامان',
  'bottomBar.friendList': 'دوستوں کی فہرست',
  'bottomBar.menu': 'مینو',
  'bottomBar.noSkill': 'کوئی سکل نہیں (دایاں کلک = حملہ)',
  'bottomBar.emptySlot': '[{key}] خالی',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - کلک: سکل فہرست، دایاں کلک: سادہ حملہ',
  'bottomBar.pickSkill': '[{key}] خالی - سکل چننے کے لیے کلک کریں',
  'bottomBar.boundSlot': '{name} [{key}] - بدلنے کے لیے دایاں کلک کریں',
  'bottomBar.clearSlot': 'خانہ [{key}] خالی چھوڑیں',
  'bottomBar.pet.normal': 'عام',
  'bottomBar.pet.random': 'بے ترتیب',
  'bottomBar.pet.owner': 'مالک',
  'bottomBar.pet.target': 'ہدف',
  'bottomBar.pet.needTarget': 'پہلے کوے کے لیے ہدف منتخب کریں',
  'exp.title': 'تجربہ',
} satisfies Partial<Record<keyof typeof en, string>>;
