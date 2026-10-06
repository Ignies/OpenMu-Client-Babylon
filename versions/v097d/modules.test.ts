import { describe, expect, it } from 'vitest';
import { scheduleKeys } from '@/modules/events/scheduleClock';
import { gameVersion } from './index';

describe('0.97d modules', () => {
  it('turns MU Helper off and keeps events and quests', () => {
    // Devil Square runs on a 0.95d world; the quests module carries the legacy chain 0.97d has.
    expect(gameVersion.modulesOff).toEqual(['mu_helper']);
  });

  it('times Blood Castle and Devil Square only: Chaos Castle came later', () => {
    // Its NpcName table has the Archangel (232, 233) and Charon (237), no Chaos Castle monster.
    expect(scheduleKeys(gameVersion)).toEqual(['bloodCastle', 'devilSquare']);
  });
});
