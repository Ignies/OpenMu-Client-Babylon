/** Portuguese text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Você não pode largar esse item',
  'notify.carryingTooMuchZen': 'Você está carregando Zen demais',
  'notify.cannotPickUp': 'Não dá para pegar isso',
} satisfies Partial<Record<keyof typeof en, string>>;
