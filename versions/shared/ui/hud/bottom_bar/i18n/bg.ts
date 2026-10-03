/** Bulgarian text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Магазин',
  'bottomBar.characterInfo': 'Данни за героя',
  'bottomBar.inventory': 'Раница',
  'bottomBar.friendList': 'Списък с приятели',
  'bottomBar.options': 'Настройки',
  'bottomBar.noSkill': 'Няма умение (десен бутон = атака)',
  'bottomBar.emptySlot': '[{key}] празно',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint':
    ' - щракване: списък с умения, десен бутон: обикновена атака',
  'bottomBar.pickSkill': '[{key}] празно - щракни, за да избереш умение',
  'bottomBar.boundSlot': '{name} [{key}] - десен бутон за смяна',
  'bottomBar.clearSlot': 'Остави мястото [{key}] празно',
  'bottomBar.pet.normal': 'Обк',
  'bottomBar.pet.random': 'Слч',
  'bottomBar.pet.owner': 'Ггд',
  'bottomBar.pet.target': 'Цел',
  'bottomBar.pet.needTarget': 'Първо избери цел за гарвана',
  'exp.title': 'Опит',
} satisfies Partial<Record<keyof typeof en, string>>;
