import { beforeAll, describe, expect, it, vi } from 'vitest';

// PlayerObject reaches the Store, which needs a browser; nothing here reads it.
vi.mock('@/app/store', () => ({ Store: {}, UIState: {} }));

/** NPCs drawn as the original client draws them, checked on the class `resolveModelFactory` hands out. */
async function load() {
  const resolve = await import('./modelFactoryPerId');
  await import('@versions/shared/monsters/models');
  return resolve;
}

let m: Awaited<ReturnType<typeof load>>;

beforeAll(async () => {
  m = await load();
}, 120_000);

describe('NPC looks from the original client', () => {
  it('Hanzo the Blacksmith draws Smith01 at 0.95 (ZzzCharacter.cpp:14517-14522)', () => {
    expect(m.resolveModelFactory(251)).toBe(m.npcFactoryFor('Smith01', 0.95));
  });
});
