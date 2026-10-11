import { afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { ENUM_WORLD } from '@/core/types';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import type { World } from '@/ecs/world';
import { createLoginScene } from './create';
import { LoginChandelierObject } from './chandelierObject';
import { LoginWallTorchObject } from './wallTorchObject';

const sceneOf = async (mapIndex: ENUM_WORLD) => {
  const tiles: unknown[] = [];
  await createLoginScene({ mapIndex, terrain: { MapTileObjects: tiles } } as unknown as World);
  return tiles;
};

describe('the login scene objects', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('lights the chandeliers and wall torches on World74 only', async () => {
    const login = await sceneOf(ENUM_WORLD.WD_73NEW_LOGIN_SCENE);
    expect(login[157]).toBe(LoginChandelierObject);
    expect(login[37]).toBe(LoginWallTorchObject);
    const select = await sceneOf(ENUM_WORLD.WD_74NEW_CHARACTER_SCENE);
    expect(select[157]).toBeUndefined();
    expect(select[37]).toBeUndefined();
  });

  it('leaves the chandeliers cold on Classic (GMEmpireGuardian4.cpp:1050-1053)', async () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    const login = await sceneOf(ENUM_WORLD.WD_73NEW_LOGIN_SCENE);
    expect(login[157]).toBeUndefined();
    expect(login[37]).toBe(LoginWallTorchObject);
  });

  it('keeps them off the prop batches', () => {
    expect(LoginChandelierObject.Batchable).toBe(false);
    expect(LoginWallTorchObject.Batchable).toBe(false);
  });
});
