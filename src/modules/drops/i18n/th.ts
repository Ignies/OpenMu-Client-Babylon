/** Thai text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'ทิ้งไอเทมนั้นไม่ได้',
  'notify.carryingTooMuchZen': 'คุณถือเซนมากเกินไป',
  'notify.cannotPickUp': 'หยิบสิ่งนั้นไม่ได้',
  'drop.skill': '+สกิล',
  'drop.option': '+ออปชัน',
  'drop.luck': '+โชค',
  'drop.knightSkill': 'สกิลเฉพาะอัศวิน',
} satisfies Partial<Record<keyof typeof en, string>>;
