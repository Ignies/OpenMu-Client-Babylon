import { describe, expect, it } from 'vitest';
import { gameVersion } from './index';

describe('0.97d modules', () => {
  it('turns MU Helper off and keeps events and quests', () => {
    // Devil Square runs on a 0.95d world; the quests module carries the legacy chain 0.97d has.
    expect(gameVersion.modulesOff).toEqual(['mu_helper']);
  });
});
