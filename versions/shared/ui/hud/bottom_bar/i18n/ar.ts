/** ar text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'متجر الأغراض',
  'bottomBar.characterInfo': 'معلومات الشخصية',
  'bottomBar.inventory': 'الحقيبة',
  'bottomBar.friendList': 'قائمة الأصدقاء',
  'bottomBar.noSkill': 'لا مهارة (النقر بالزر الأيمن = هجوم)',
  'bottomBar.emptySlot': '[{key}] فارغة',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - النقر: قائمة المهارات، النقر بالزر الأيمن: هجوم عادي',
  'bottomBar.pickSkill': '[{key}] فارغة - انقر لاختيار مهارة',
  'bottomBar.boundSlot': '{name} [{key}] - انقر بالزر الأيمن للتغيير',
  'bottomBar.clearSlot': 'ترك الخانة [{key}] فارغة',
  'bottomBar.pet.normal': 'عادي',
  'bottomBar.pet.random': 'عشوائي',
  'bottomBar.pet.owner': 'مالك',
  'bottomBar.pet.target': 'هدف',
  'bottomBar.pet.needTarget': 'اختر هدفا للغراب أولا',
  'exp.title': 'الخبرة',
  'bottomBar.menu': 'القائمة',
} satisfies Partial<Record<keyof typeof en, string>>;
