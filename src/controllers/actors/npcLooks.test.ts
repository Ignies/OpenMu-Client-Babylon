import { beforeAll, describe, expect, it, vi } from 'vitest';
import { monsterRegistry } from '@/controllers/monsters';
import { CharacterClassNumber } from '@/core/types';

// PlayerObject reaches the Store, which needs a browser; nothing here reads it.
vi.mock('@/app/store', () => ({ Store: {}, UIState: {} }));

/** NPCs drawn as the original client draws them, checked on the class `resolveModelFactory` hands out. */
async function load() {
  const resolve = await import('./modelFactoryPerId');
  const { gearedNpcFactory } = await import('./playerNpc');
  await import('@versions/shared/monsters/models');
  return { ...resolve, gearedNpcFactory };
}

let m: Awaited<ReturnType<typeof load>>;

beforeAll(async () => {
  m = await load();
}, 120_000);

describe('NPC looks from the original client', () => {
  it('Hanzo the Blacksmith draws Smith01 at 0.95 (ZzzCharacter.cpp:14517-14522)', () => {
    expect(m.resolveModelFactory(251)).toBe(m.npcFactoryFor('Smith01', 0.95));
  });

  // OpenNpc + CreateCharacter and nothing else (ZzzCharacter.cpp:14295-14299, :14415-14418, :14531-14535).
  it.each([
    [226, 'Breeder'],
    [240, 'Storage01'],
    [254, 'Wizard01'],
  ])('%i is a plain NPC model (%s) with no class of its own', (type, file) => {
    expect(m.resolveModelFactory(type)).toBe(m.npcFactoryFor(file, 1));
  });

  it('Zyro wears the Moss model at 0.8, as Moss does (ZzzCharacter.cpp:14505-14516, :14846-14860)', () => {
    expect(m.resolveModelFactory(568)).toBe(m.npcFactoryFor('gambler_moss', 0.8));
    expect(m.resolveModelFactory(568)).toBe(m.resolveModelFactory(492));
  });

  // CreateCharacter(MODEL_PLAYER) leaves c->Class = CLASS_WIZARD (ZzzCharacter.cpp:11732-11735).
  it('the Cursed Wizard wears Legendary +9, staff and shield, on a wizard rig (ZzzCharacter.cpp:13907-13931)', () => {
    const gear = monsterRegistry.def(34)?.gear;
    expect(gear).toMatchObject({
      charClass: CharacterClassNumber.DarkWizard,
      set: 3,
      level: 9,
      mainHand: { group: 5, num: 5 },
      offHand: { group: 6, num: 14 },
    });
    expect(m.resolveModelFactory(34)).toBe(m.gearedNpcFactory(gear!));
  });

  it('Luke, Leo and Ellen are one plate-rig case (ZzzCharacter.cpp:14612-14625)', () => {
    expect(m.resolveModelFactory(371)).toBe(m.resolveModelFactory(258));
    expect(m.resolveModelFactory(414)).toBe(m.resolveModelFactory(258));
  });
});
