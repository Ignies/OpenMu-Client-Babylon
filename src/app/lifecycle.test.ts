import { describe, expect, it, vi } from 'vitest';
import { resetForMapChange } from './lifecycle';

const { calls, resetter } = vi.hoisted(() => {
  const calls: string[] = [];
  return { calls, resetter: (name: string) => ({ [name]: { reset: () => calls.push(name) } }) };
});
vi.mock('@/controllers/weather', () => resetter('weather'));
vi.mock('@/controllers/lighting', () => resetter('lighting'));
vi.mock('@/controllers/fx', () => resetter('effects'));
vi.mock('@/controllers/combat', () => resetter('combat'));
vi.mock('@/controllers/sound', () => resetter('sound'));
vi.mock('@/controllers/maps', () => resetter('maps'));
vi.mock('@/modules/events', () => resetter('events'));
vi.mock('@/modules/skills', () => resetter('skills'));
vi.mock('@/modules/quests', () => resetter('quests'));
vi.mock('@/controllers/assets', () => ({ evictUnusedContainers: (folders: string[]) => calls.push(`evict ${folders.join(' ')}`) }));
vi.mock('@versions/shared/objects/signs/signPlates', () => ({ disposeSignPlates: () => calls.push('signs') }));

describe('resetForMapChange', () => {
  it('resets in order, then frees the sign plates and the unused monster and NPC models', () => {
    resetForMapChange();
    expect(calls).toEqual(['weather', 'lighting', 'effects', 'events', 'skills', 'combat', 'quests', 'sound', 'maps', 'signs', 'evict /Monster/ /Npc/']);
  });
});
