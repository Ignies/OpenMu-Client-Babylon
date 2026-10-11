/** Russian text of the ECS systems (`src/ecs`). */

import type en from './en';

export default {
  'instrument.needStanding': 'Стойте на месте, чтобы достать инструмент',
  'notify.arrowsReloaded': 'Стрелы перезаряжены',
  'notify.noMoreArrows': 'Стрелы закончились',
} satisfies Partial<Record<keyof typeof en, string>>;
