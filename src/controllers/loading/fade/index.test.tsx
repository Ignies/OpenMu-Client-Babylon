import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const { WarpFade, warpFades } = await import('.');
const { Loading } = await import('../loadingState');

afterEach(() => {
  setFidelityChoice(FIDELITY_DEFAULT, {});
  Loading.setSceneLoading(false);
  Loading.setWarpSnapshot(null);
});

describe('the warp fade (warpFade)', () => {
  it('fades a warp to another map from inside the world', () => {
    expect(warpFades(true, 0, 2)).toBe(true);
    expect(warpFades(true, 2, 2)).toBe(false);
    expect(warpFades(false, 0, 2)).toBe(false);
  });

  it('never fades on Classic: the loading screen covers the warp', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(warpFades(true, 0, 2)).toBe(false);
  });

  it('covers the load with the still until the scene is in, then lets go of the warp', () => {
    Loading.setSceneLoading(true);
    Loading.setInWorldWarp(true);
    Loading.setWarpSnapshot('data:image/jpeg;base64,AA');
    expect(renderToStaticMarkup(<WarpFade />)).toContain('warp-fade is-covering');
    Loading.setSceneLoading(false);
    expect(Loading.inWorldWarp).toBe(false);
    expect(renderToStaticMarkup(<WarpFade />)).not.toContain('is-covering');
  });
});
