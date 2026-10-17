import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInAction } from 'mobx';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const { MuHelperButtons } = await import('.');
const { Ecs } = await import('@/ecs/current');

describe('the MU Helper HUD buttons (muHelperButtons)', () => {
  afterEach(() => {
    runInAction(() => {
      Ecs.world = null;
    });
    setFidelityChoice(FIDELITY_DEFAULT, {});
  });

  it('shows Start and Settings in the world on Enhanced', () => {
    runInAction(() => {
      Ecs.world = { playerEntity: {} } as never;
    });
    const html = renderToStaticMarkup(<MuHelperButtons />);
    expect(html).toContain('Start helper');
    expect(html).toContain('Helper settings');
  });

  it('draws nothing on Classic', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    runInAction(() => {
      Ecs.world = { playerEntity: {} } as never;
    });
    expect(renderToStaticMarkup(<MuHelperButtons />)).toBe('');
  });
});
