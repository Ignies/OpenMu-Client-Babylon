import { afterEach, describe, expect, it, vi } from 'vitest';
import { monsterModelRegistry } from '@/controllers/monsters';
import {
  monsterVoices,
  monsterAttackSound,
  monsterDeathSound,
  monsterIdleSound,
} from './monsters';
import { SOUND_FILES } from './recipes';

const YETI = 12;
const ELITE_YETI = 13;
const DEATH_CENTURION = 67;
const SHRIKER = 69;
const QUEEN_RAINER = 51;

describe('monster voice table', () => {
  afterEach(() => vi.restoreAllMocks());

  it('names a catalogue key in every slot', () => {
    const bodies = monsterModelRegistry.all();
    expect(bodies.length).toBeGreaterThan(150);
    const missing = bodies.flatMap(({ type, voices }) =>
      (voices ?? [])
        .filter((k): k is string => k !== null && !(k in SOUND_FILES))
        .map(k => `model ${type} -> ${k}`)
    );
    expect(missing).toEqual([]);
  });

  it('gives the Devias yetis their own voice', () => {
    for (const type of [YETI, ELITE_YETI]) {
      expect(monsterVoices(type)?.every(k => k?.startsWith('Sound/mYeti'))).toBe(true);
    }
  });

  it('shifts the Kalima SubType 9 bosses onto the next five waves', () => {
    expect(monsterDeathSound(DEATH_CENTURION)).toBe('Sound/mDsDeath');
    expect(monsterDeathSound(DEATH_CENTURION, 145)).toBe('Sound/mLsDeath');
    expect(monsterDeathSound(DEATH_CENTURION, 148)).toBe('Sound/mDsDeath');
    expect(monsterDeathSound(SHRIKER, 161)).toBe('Sound/mLvDeath');
  });

  it('stays silent on the half of the roll that lands on an empty slot', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(monsterIdleSound(QUEEN_RAINER)).toBeNull();
    expect(monsterAttackSound(57)).toBeNull();

    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(monsterIdleSound(QUEEN_RAINER)).toBe('Sound/mRainner1');
    expect(monsterAttackSound(57)).toBe('Sound/mRedSkullAttack');
  });
});
