/** Romanian text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Magazin',
  'bottomBar.characterInfo': 'Informații despre personaj',
  'bottomBar.inventory': 'Inventar',
  'bottomBar.friendList': 'Lista de prieteni',
  'bottomBar.options': 'Opțiuni',
  'bottomBar.noSkill': 'Nicio abilitate (clic dreapta = atac)',
  'bottomBar.emptySlot': '[{key}] gol',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint':
    ' - clic: lista de abilități, clic dreapta: atac simplu',
  'bottomBar.pickSkill': '[{key}] gol - dă clic ca să alegi o abilitate',
  'bottomBar.boundSlot': '{name} [{key}] - clic dreapta ca să schimbi',
  'bottomBar.clearSlot': 'Lasă locul [{key}] gol',
  'bottomBar.pet.normal': 'Nor',
  'bottomBar.pet.random': 'Ale',
  'bottomBar.pet.owner': 'Stp',
  'bottomBar.pet.target': 'Țnt',
  'bottomBar.pet.needTarget': 'Alege mai întâi o țintă pentru corb',
  'exp.title': 'Experiență',
} satisfies Partial<Record<keyof typeof en, string>>;
