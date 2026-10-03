/** Korean text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': '악기를 꺼내려면 멈춰 서세요',
  'notify.arrowsReloaded': '화살을 장전했습니다',
  'notify.noMoreArrows': '화살이 없습니다',
} satisfies Partial<Record<keyof typeof en, string>>;
