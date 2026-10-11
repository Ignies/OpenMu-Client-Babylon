/** Russian text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Магазин',
  'bottomBar.characterInfo': 'Сведения о персонаже',
  'bottomBar.inventory': 'Инвентарь',
  'bottomBar.friendList': 'Список друзей',
  'bottomBar.menu': 'Меню',
  'bottomBar.noSkill': 'Нет умения (правый клик - атака)',
  'bottomBar.emptySlot': '[{key}] пусто',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint':
    ' - клик: список умений, правый клик: обычная атака',
  'bottomBar.pickSkill': '[{key}] пусто - нажмите, чтобы выбрать умение',
  'bottomBar.boundSlot': '{name} [{key}] - правый клик, чтобы сменить',
  'bottomBar.clearSlot': 'Оставить ячейку [{key}] пустой',
  'bottomBar.pet.normal': 'Обч',
  'bottomBar.pet.random': 'Слч',
  'bottomBar.pet.owner': 'Хзн',
  'bottomBar.pet.target': 'Цль',
  'bottomBar.pet.needTarget': 'Сначала выберите цель для ворона',
  'exp.title': 'Опыт',
} satisfies Partial<Record<keyof typeof en, string>>;
