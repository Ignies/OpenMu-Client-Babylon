/** Spanish text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Tienda',
  'bottomBar.characterInfo': 'Información del personaje',
  'bottomBar.inventory': 'Inventario',
  'bottomBar.friendList': 'Lista de amigos',
  'bottomBar.menu': 'Menú',
  'bottomBar.noSkill': 'Sin habilidad (clic derecho = ataque)',
  'bottomBar.emptySlot': '[{key}] vacío',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint':
    ' - clic: lista de habilidades, clic derecho: ataque normal',
  'bottomBar.pickSkill': '[{key}] vacío - haz clic para elegir una habilidad',
  'bottomBar.boundSlot': '{name} [{key}] - clic derecho para cambiar',
  'bottomBar.clearSlot': 'Dejar vacía la ranura [{key}]',
  'bottomBar.pet.normal': 'Nor',
  'bottomBar.pet.random': 'Alz',
  'bottomBar.pet.owner': 'Amo',
  'bottomBar.pet.target': 'Obj',
  'bottomBar.pet.needTarget': 'Elige antes un objetivo para el cuervo',
  'exp.title': 'Experiencia',
} satisfies Partial<Record<keyof typeof en, string>>;
