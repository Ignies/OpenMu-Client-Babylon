/** Portuguese text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Loja',
  'bottomBar.characterInfo': 'Informações do personagem',
  'bottomBar.inventory': 'Inventário',
  'bottomBar.friendList': 'Lista de amigos',
  'bottomBar.options': 'Opções',
  'bottomBar.noSkill': 'Sem habilidade (clique direito = ataque)',
  'bottomBar.emptySlot': '[{key}] vazio',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint':
    ' - clique: lista de habilidades, clique direito: ataque comum',
  'bottomBar.pickSkill': '[{key}] vazio - clique para escolher uma habilidade',
  'bottomBar.boundSlot': '{name} [{key}] - clique direito para trocar',
  'bottomBar.clearSlot': 'Deixar o espaço [{key}] vazio',
  'bottomBar.pet.normal': 'Nor',
  'bottomBar.pet.random': 'Ale',
  'bottomBar.pet.owner': 'Don',
  'bottomBar.pet.target': 'Alv',
  'bottomBar.pet.needTarget': 'Escolha antes um alvo para o corvo',
  'exp.title': 'Experiência',
} satisfies Partial<Record<keyof typeof en, string>>;
