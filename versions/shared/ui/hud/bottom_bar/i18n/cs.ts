/** cs text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Obchod s předměty',
  'bottomBar.characterInfo': 'Informace o postavě',
  'bottomBar.inventory': 'Inventář',
  'bottomBar.friendList': 'Seznam přátel',
  'bottomBar.noSkill': 'Bez dovednosti (pravé tlačítko = útok)',
  'bottomBar.emptySlot': '[{key}] prázdné',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' – klik: seznam dovedností, pravý klik: obyčejný útok',
  'bottomBar.pickSkill': '[{key}] prázdné – kliknutím vyber dovednost',
  'bottomBar.boundSlot': '{name} [{key}] – pravým kliknutím změníš',
  'bottomBar.clearSlot': 'Ponechat pole [{key}] prázdné',
  'bottomBar.pet.normal': 'Výc',
  'bottomBar.pet.random': 'Náh',
  'bottomBar.pet.owner': 'Pán',
  'bottomBar.pet.target': 'Cíl',
  'bottomBar.pet.needTarget': 'Nejdřív vyber cíl pro havrana',
  'exp.title': 'Zkušenosti',
} satisfies Partial<Record<keyof typeof en, string>>;
