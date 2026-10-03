/** Italian text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Negozio',
  'bottomBar.characterInfo': 'Informazioni del personaggio',
  'bottomBar.inventory': 'Inventario',
  'bottomBar.friendList': 'Lista amici',
  'bottomBar.options': 'Opzioni',
  'bottomBar.noSkill': 'Nessuna abilità (clic destro = attacco)',
  'bottomBar.emptySlot': '[{key}] vuoto',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint':
    ' - clic: lista abilità, clic destro: attacco semplice',
  'bottomBar.pickSkill': '[{key}] vuoto - clicca per scegliere un’abilità',
  'bottomBar.boundSlot': '{name} [{key}] - clic destro per cambiare',
  'bottomBar.clearSlot': 'Lascia vuoto lo slot [{key}]',
  'bottomBar.pet.normal': 'Nor',
  'bottomBar.pet.random': 'Cas',
  'bottomBar.pet.owner': 'Pad',
  'bottomBar.pet.target': 'Ber',
  'bottomBar.pet.needTarget': 'Scegli prima un bersaglio per il corvo',
  'exp.title': 'Esperienza',
} satisfies Partial<Record<keyof typeof en, string>>;
