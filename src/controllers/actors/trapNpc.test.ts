import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { ENUM_WORLD } from '@/core/types';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// No GLB for the world object a trap borrows on this map.
vi.mock('@/controllers/assets', async importOriginal => ({
  ...(await importOriginal<object>()),
  loadGLTF: () => Promise.reject(new Error('404')),
}));

const { resolveModelFactory } = await import('./modelFactoryPerId');
await import('@versions/shared/monsters/models');

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

// MONSTER_LASER_TRAP is world object 51 (ZzzCharacter.cpp:14285), and Kanturu Relics' Data/Object39 has no
// Object52.bmd: the original's model slot is empty there and draws nothing.
describe('a trap on a map without the object it borrows', () => {
  it('stands ready with no body, not as a missing model', async () => {
    const trap = new (resolveModelFactory(106))(scene);
    trap.WorldIndex = ENUM_WORLD.WD_38KANTURU_2ND;
    await trap.init({ scene } as never, {} as never);
    expect(trap.Ready).toBe(true);
    expect(trap.gltf).toBeNull();
  });
});
