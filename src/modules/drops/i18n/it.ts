/** Italian text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Non puoi gettare quell’oggetto',
  'notify.carryingTooMuchZen': 'Stai portando troppo Zen',
  'notify.cannotPickUp': 'Non puoi raccogliere quello',
  'drop.skill': '+Abilità',
  'drop.option': '+Opzione',
  'drop.luck': '+Fortuna',
  'drop.knightSkill': 'Abilità esclusiva del cavaliere',
} satisfies Partial<Record<keyof typeof en, string>>;
