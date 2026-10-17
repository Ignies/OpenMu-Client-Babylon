/** tr text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Bu eşya yere atılamaz',
  'notify.carryingTooMuchZen': 'Çok fazla Zen taşıyorsun',
  'notify.cannotPickUp': 'Bu yerden alınamaz',
  'drop.skill': '+Yetenek',
  'drop.option': '+Özellik',
  'drop.luck': '+Şans',
  'drop.knightSkill': 'Şövalyeye özel yetenek',
} satisfies Partial<Record<keyof typeof en, string>>;
