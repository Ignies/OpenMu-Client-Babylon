/** fa text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'این آیتم را نمی‌توان انداخت',
  'notify.carryingTooMuchZen': 'Zen بیش از حدی همراه دارید',
  'notify.cannotPickUp': 'این را نمی‌توان برداشت',
  'drop.skill': '+مهارت',
  'drop.option': '+خاصیت',
  'drop.luck': '+شانس',
  'drop.knightSkill': 'مهارت ویژه شوالیه',
} satisfies Partial<Record<keyof typeof en, string>>;
