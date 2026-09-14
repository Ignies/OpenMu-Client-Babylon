import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Effect } from '../libs/babylon/exports';
import { GameOptions, setGameOption } from './gameOptions';
import {
  LINE_WIDTH_MAX,
  LINE_WIDTH_MIN,
  RENDERING_STYLES,
  RENDERING_STYLE_MAX,
  TOON_FILTER_UNIFORM,
  TOON_UNIFORM,
  bindToon,
  inkDarkness,
  inkWidth,
  lineWidth,
  renderingStyle,
  shadeSteps,
  styleIndex,
  styleStrength,
  syncRenderingStyle,
  toonFlatActive,
  toonFunctionsGlsl,
  toonRampActive,
  toonTerrainDefines,
} from './renderingStyle';

const initial = {
  lightingQuality: GameOptions.lightingQuality,
  renderingStyle: GameOptions.renderingStyle,
  shadeSteps: GameOptions.shadeSteps,
  styleStrength: GameOptions.styleStrength,
  lineWidth: GameOptions.lineWidth,
};

const stubEffect = () => {
  const setFloat4 = vi.fn();
  return { effect: { setFloat4 } as unknown as Effect, setFloat4 };
};

const written = (setFloat4: ReturnType<typeof vi.fn>, name: string) =>
  setFloat4.mock.calls.filter(call => call[0] === name).map(call => call.slice(1));

afterEach(() => {
  for (const [key, value] of Object.entries(initial)) {
    setGameOption(key as keyof typeof initial, value);
  }
  syncRenderingStyle();
});

describe('renderingStyle', () => {
  it('is off on the Classic tier whatever the option says', () => {
    setGameOption('lightingQuality', 0);
    for (let style = 0; style <= RENDERING_STYLE_MAX; style++) {
      setGameOption('renderingStyle', style);
      expect(renderingStyle()).toBeNull();
    }
  });

  it('is off at style 0 on every tier', () => {
    setGameOption('renderingStyle', 0);
    for (const tier of [0, 1, 2]) {
      setGameOption('lightingQuality', tier);
      expect(renderingStyle()).toBeNull();
    }
  });

  it('returns the table row on tiers >= 1', () => {
    for (const tier of [1, 2]) {
      setGameOption('lightingQuality', tier);
      for (let style = 1; style <= RENDERING_STYLE_MAX; style++) {
        setGameOption('renderingStyle', style);
        expect(renderingStyle()).toBe(RENDERING_STYLES[style]);
      }
    }
  });

  it('has a Cel row with bands alone and an Anime row with everything', () => {
    expect(RENDERING_STYLES[0]).toBeNull();
    expect(RENDERING_STYLES[1]).toMatchObject({ ramp: true, rim: 0, outline: false, flat: false });
    expect(RENDERING_STYLES[2]).toMatchObject({ ramp: true, outline: true, flat: true });
    expect(RENDERING_STYLES[2]?.rim).toBeGreaterThan(0);
  });

  it('rounds and clamps the readers', () => {
    setGameOption('renderingStyle', 2.6);
    expect(styleIndex()).toBe(RENDERING_STYLE_MAX);
    setGameOption('renderingStyle', -1);
    expect(styleIndex()).toBe(0);

    setGameOption('shadeSteps', 1);
    expect(shadeSteps()).toBe(2);
    setGameOption('shadeSteps', 9);
    expect(shadeSteps()).toBe(4);
    setGameOption('shadeSteps', 2.4);
    expect(shadeSteps()).toBe(2);

    setGameOption('styleStrength', 12);
    expect(styleStrength()).toBe(9);
    setGameOption('styleStrength', -3);
    expect(styleStrength()).toBe(1);

    setGameOption('lineWidth', 0);
    expect(lineWidth()).toBe(LINE_WIDTH_MIN);
    setGameOption('lineWidth', 9);
    expect(lineWidth()).toBe(LINE_WIDTH_MAX);
    setGameOption('lineWidth', 2.6);
    expect(lineWidth()).toBe(3);
  });
});

describe('the material snapshot', () => {
  it('follows the tier and the style', () => {
    setGameOption('lightingQuality', 0);
    setGameOption('renderingStyle', 2);
    syncRenderingStyle();
    expect(toonRampActive()).toBe(false);
    expect(toonFlatActive()).toBe(false);
    expect(toonTerrainDefines()).toEqual([]);

    setGameOption('lightingQuality', 1);
    syncRenderingStyle();
    expect(toonRampActive()).toBe(true);
    expect(toonFlatActive()).toBe(true);
    expect(toonTerrainDefines()).toEqual(['#define MU_TOON_FLAT']);

    setGameOption('renderingStyle', 1);
    syncRenderingStyle();
    expect(toonRampActive()).toBe(true);
    expect(toonFlatActive()).toBe(false);

    setGameOption('renderingStyle', 0);
    syncRenderingStyle();
    expect(toonRampActive()).toBe(false);
  });

  it('turns the strength dial into darker lines and leaves their width alone', () => {
    setGameOption('lightingQuality', 1);
    setGameOption('renderingStyle', 2);
    setGameOption('lineWidth', 2);

    setGameOption('styleStrength', 1);
    syncRenderingStyle();
    const low = { dark: inkDarkness(), width: inkWidth() };

    setGameOption('styleStrength', 9);
    syncRenderingStyle();
    const high = { dark: inkDarkness(), width: inkWidth() };

    expect(high.dark).toBeGreaterThan(low.dark);
    expect(high.dark).toBeLessThanOrEqual(1);
    expect(low.width).toBe(2);
    expect(high.width).toBe(2);
  });

  it('takes the line width from its own slider', () => {
    setGameOption('lightingQuality', 1);
    setGameOption('renderingStyle', 2);
    for (const width of [LINE_WIDTH_MIN, 3, LINE_WIDTH_MAX]) {
      setGameOption('lineWidth', width);
      syncRenderingStyle();
      expect(inkWidth()).toBe(width);
    }
  });

  it('binds nothing while inactive', () => {
    setGameOption('lightingQuality', 1);
    setGameOption('renderingStyle', 0);
    syncRenderingStyle();

    const { effect, setFloat4 } = stubEffect();
    bindToon(effect, true);
    expect(setFloat4).not.toHaveBeenCalled();
  });

  it('binds the bands for everyone and the rim for the figures alone', () => {
    setGameOption('lightingQuality', 1);
    setGameOption('shadeSteps', 3);

    setGameOption('renderingStyle', 1);
    syncRenderingStyle();
    let stub = stubEffect();
    bindToon(stub.effect, true);
    bindToon(stub.effect, false);
    let bands = written(stub.setFloat4, TOON_UNIFORM);
    expect(bands.map(b => b.slice(0, 3))).toEqual([[3, 1, 0], [3, 1, 0]]);
    expect(written(stub.setFloat4, TOON_FILTER_UNIFORM)).toEqual([]);

    setGameOption('renderingStyle', 2);
    syncRenderingStyle();
    stub = stubEffect();
    bindToon(stub.effect, true);
    bindToon(stub.effect, false);
    bands = written(stub.setFloat4, TOON_UNIFORM);
    expect(bands[0][2]).toBeGreaterThan(0);
    expect(bands[1][2]).toBe(0);
    expect(written(stub.setFloat4, TOON_FILTER_UNIFORM)).toHaveLength(2);
  });
});

describe('the GLSL helpers', () => {
  it('compile under the style defines only', () => {
    const glsl = toonFunctionsGlsl();
    expect(glsl).toContain('#if defined(MU_TOON) || defined(MU_TOON_FLAT)');
    expect(glsl).toContain('#ifdef MU_TOON_FLAT');
    expect(glsl).toContain('muToonBands');
    expect(glsl).toContain('muToonStep');
    expect(glsl).toContain('muToonFlat');
    expect(glsl).toContain('fwidth');
    expect(glsl).not.toMatch(/\/\/[^\n]*;/);
  });
});
