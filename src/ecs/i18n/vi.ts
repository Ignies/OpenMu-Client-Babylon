/** Vietnamese text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': 'Hãy đứng yên để lấy nhạc cụ ra',
  'notify.arrowsReloaded': 'Đã nạp lại tên',
  'notify.noMoreArrows': 'Hết tên',
} satisfies Partial<Record<keyof typeof en, string>>;
