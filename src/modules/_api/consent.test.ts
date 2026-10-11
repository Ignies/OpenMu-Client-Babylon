import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { askConsent } from './consent';

const entry = { id: 'third', version: '1.0.0' };

describe('askConsent', () => {
  let data: Map<string, string>;
  beforeEach(() => {
    data = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('asks once per world and module version, and remembers the answer either way', async () => {
    const prompt = vi.fn(async () => true);
    expect(await askConsent('list:7', entry, prompt)).toBe(true);
    expect(await askConsent('list:7', entry, prompt)).toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);

    prompt.mockResolvedValue(false);
    expect(await askConsent('list:8', entry, prompt)).toBe(false);
    expect(await askConsent('list:8', entry, prompt)).toBe(false);
    expect(await askConsent('list:7', { ...entry, version: '1.1.0' }, prompt)).toBe(false);
    expect(prompt).toHaveBeenCalledTimes(3);
    expect(JSON.parse(data.get('mu_module_consent') ?? '')).toEqual({
      'list:7': { 'third@1.0.0': true, 'third@1.1.0': false },
      'list:8': { 'third@1.0.0': false },
    });
  });

  it('counts a box that was never answered as no, and asks again next time', async () => {
    const prompt = vi.fn(async () => undefined);
    expect(await askConsent('list:7', entry, prompt)).toBe(false);
    expect(await askConsent('list:7', entry, prompt)).toBe(false);
    expect(prompt).toHaveBeenCalledTimes(2);
  });

  it('asks every time when nothing can be stored', async () => {
    vi.stubGlobal('localStorage', undefined);
    const prompt = vi.fn(async () => true);
    expect(await askConsent('list:7', entry, prompt)).toBe(true);
    expect(await askConsent('list:7', entry, prompt)).toBe(true);
    expect(prompt).toHaveBeenCalledTimes(2);
  });
});
