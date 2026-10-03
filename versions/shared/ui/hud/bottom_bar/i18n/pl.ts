/** Polish text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Sklep z przedmiotami',
  'bottomBar.characterInfo': 'Informacje o postaci',
  'bottomBar.inventory': 'Ekwipunek',
  'bottomBar.friendList': 'Lista znajomych',
  'bottomBar.options': 'Opcje',
  'bottomBar.noSkill': 'Brak umiejętności (prawy klik = atak)',
  'bottomBar.emptySlot': '[{key}] puste',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - klik: lista umiejętności, prawy klik: zwykły atak',
  'bottomBar.pickSkill': '[{key}] puste - kliknij, aby wybrać umiejętność',
  'bottomBar.boundSlot': '{name} [{key}] - prawy klik, aby zmienić',
  'bottomBar.clearSlot': 'Zostaw pole [{key}] puste',
  'bottomBar.pet.normal': 'Nor',
  'bottomBar.pet.random': 'Los',
  'bottomBar.pet.owner': 'Pan',
  'bottomBar.pet.target': 'Cel',
  'bottomBar.pet.needTarget': 'Najpierw wybierz cel dla kruka',
  'exp.title': 'Doświadczenie',
} satisfies Partial<Record<keyof typeof en, string>>;
