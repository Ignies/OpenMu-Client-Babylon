/** ca text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Botiga',
  'bottomBar.characterInfo': 'Informació del personatge',
  'bottomBar.inventory': 'Inventari',
  'bottomBar.friendList': 'Llista d\'amics',
  'bottomBar.noSkill': 'Cap habilitat (clic dret = atac)',
  'bottomBar.emptySlot': '[{key}] buit',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - clic: llista d\'habilitats, clic dret: atac normal',
  'bottomBar.pickSkill': '[{key}] buit - fes clic per triar una habilitat',
  'bottomBar.boundSlot': '{name} [{key}] - clic dret per canviar-la',
  'bottomBar.clearSlot': 'Deixa buida la ranura [{key}]',
  'bottomBar.pet.normal': 'Nor',
  'bottomBar.pet.random': 'Atz',
  'bottomBar.pet.owner': 'Amo',
  'bottomBar.pet.target': 'Obj',
  'bottomBar.pet.needTarget': 'Primer selecciona un objectiu per al corb',
  'exp.title': 'Experiència',
  'bottomBar.menu': 'Menú',
} satisfies Partial<Record<keyof typeof en, string>>;
