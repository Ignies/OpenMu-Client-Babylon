/** uk text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Крамниця предметів',
  'bottomBar.characterInfo': 'Інформація про персонажа',
  'bottomBar.inventory': 'Інвентар',
  'bottomBar.friendList': 'Список друзів',
  'bottomBar.noSkill': 'Без навички (права кнопка = атака)',
  'bottomBar.emptySlot': '[{key}] порожньо',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - клік: список навичок, права кнопка: звичайна атака',
  'bottomBar.pickSkill': '[{key}] порожньо - клацніть, щоб вибрати навичку',
  'bottomBar.boundSlot': '{name} [{key}] - права кнопка, щоб змінити',
  'bottomBar.clearSlot': 'Залишити комірку [{key}] порожньою',
  'bottomBar.pet.normal': 'Звч',
  'bottomBar.pet.random': 'Вип',
  'bottomBar.pet.owner': 'Влс',
  'bottomBar.pet.target': 'Ціл',
  'bottomBar.pet.needTarget': 'Спершу виберіть ціль для крука',
  'exp.title': 'Досвід',
  'bottomBar.menu': 'Меню',
} satisfies Partial<Record<keyof typeof en, string>>;
