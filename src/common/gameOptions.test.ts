import { afterEach, describe, expect, it, vi } from 'vitest';
import { migrate } from './gameOptions';

const DROPPED = [
  'darkness',
  'sceneDarkening',
  'contrast',
  'colorTint',
  'saturation',
  'mapGradient',
  'toneMapping',
  'exposure',
];

/** A blob as the grade-era client saved it, every field at its old default. */
const oldBlob = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  shadows: true,
  postProcessing: true,
  toneMapping: true,
  contrast: 5,
  exposure: 5,
  darkness: 8,
  sceneDarkening: true,
  colorTint: 0,
  saturation: 0,
  mapGradient: 3,
  vignette: 13,
  lightingQuality: 0,
  materialQuality: 0,
  ...over,
});

describe('gameOptions migration', () => {
  afterEach(() => vi.restoreAllMocks());

  it('leaves a current blob alone', () => {
    const blob = { toneMapper: 3, brightness: 4, vignette: 9 };
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    expect(migrate(blob)).toBe(false);
    expect(blob).toEqual({ toneMapper: 3, brightness: 4, vignette: 9 });
    expect(info).not.toHaveBeenCalled();
  });

  it('maps toneMapping true to the Standard curve and false to none', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});

    const on = oldBlob({ toneMapping: true });
    expect(migrate(on)).toBe(true);
    expect(on.toneMapper).toBe(1);

    const off = oldBlob({ toneMapping: false });
    migrate(off);
    expect(off.toneMapper).toBe(0);
  });

  it('keeps a toneMapper already stored beside the old flag', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const blob = oldBlob({ toneMapping: false, toneMapper: 3 });
    migrate(blob);
    expect(blob.toneMapper).toBe(3);
  });

  it('replaces exposure with brightness 0', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const blob = oldBlob({ exposure: 9 });
    migrate(blob);
    expect(blob.brightness).toBe(0);
    expect('exposure' in blob).toBe(false);
  });

  it('resets the old vignette default and rescales a chosen value', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});

    const untouched = oldBlob({ vignette: 13 });
    migrate(untouched);
    expect(untouched.vignette).toBe(0);

    const chosen = oldBlob({ vignette: 25 });
    migrate(chosen);
    expect(chosen.vignette).toBe(9);

    const low = oldBlob({ vignette: 5 });
    migrate(low);
    expect(low.vignette).toBe(2);
  });

  it('drops the eight retired keys and names each in one console line', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const blob = oldBlob();

    migrate(blob);

    for (const key of DROPPED) expect(key in blob).toBe(false);
    expect(info).toHaveBeenCalledTimes(1);

    const line = info.mock.calls[0][0] as string;
    for (const key of DROPPED) expect(line).toContain(key);
    expect(line).toContain('vignette 13/25 -> 0/9');
  });

  it('keeps the stored tiers', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const blob = oldBlob();
    migrate(blob);
    expect(blob.lightingQuality).toBe(0);
    expect(blob.materialQuality).toBe(0);
  });
});
