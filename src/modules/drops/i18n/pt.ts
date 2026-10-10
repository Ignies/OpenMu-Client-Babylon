/** Portuguese text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Você não pode largar esse item',
  'notify.carryingTooMuchZen': 'Você está carregando Zen demais',
  'notify.cannotPickUp': 'Não dá para pegar isso',
  'drop.skill': '+Habilidade',
  'drop.option': '+Opção',
  'drop.luck': '+Sorte',
  'drop.knightSkill': 'Habilidade exclusiva do cavaleiro',
} satisfies Partial<Record<keyof typeof en, string>>;
