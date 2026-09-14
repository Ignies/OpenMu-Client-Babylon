import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Effect } from '../libs/babylon/exports';
import { GameOptions, setGameOption } from './gameOptions';
import {
  RENDERING_STYLES,
  RENDERING_STYLE_MAX,
  bindToon,
  outlineStrength,
  renderingStyle,
  shadeSteps,
  styleIndex,
  syncRenderingStyle,
  toonFunctionsGlsl,
  toonRampActive,
} from './renderingStyle';

const initial = {
  lightingQuality: GameOptions.lightingQuality,
  renderingStyle: GameOptions.renderingStyle,
  shadeSteps: GameOptions.shadeSteps,
  outlineStrength: GameOptions.outlineStrength,
};

const stubEffect = () => {
  const setFloat4 = vi.fn();
  return { effect: { setFloat4 } as unknown as Effect, setFloat4 };
};

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

  it('has a Cel row with no rim and no lines, and an Anime row with both', () => {
    expect(RENDERING_STYLES[0]).toBeNull();
    expect(RENDERING_STYLES[1]).toMatchObject({ ramp: true, rim: 0, outline: false });
    expect(RENDERING_STYLES[2]).toMatchObject({ ramp: true, outline: true });
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

    setGameOption('outlineStrength', 12);
    expect(outlineStrength()).toBe(9);
    setGameOption('outlineStrength', -3);
    expect(outlineStrength()).toBe(0);
  });
});

describe('the material snapshot', () => {
  it('follows the tier and the style', () => {
    setGameOption('lightingQuality', 0);
    setGameOption('renderingStyle', 2);
    syncRenderingStyle();
    expect(toonRampActive()).toBe(false);

    setGameOption('lightingQuality', 1);
    syncRenderingStyle();
    expect(toonRampActive()).toBe(true);

    setGameOption('renderingStyle', 0);
    syncRenderingStyle();
    expect(toonRampActive()).toBe(false);
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
    expect(stub.setFloat4.mock.calls[0].slice(1, 4)).toEqual([3, 1, 0]);
    expect(stub.setFloat4.mock.calls[1].slice(1, 4)).toEqual([3, 1, 0]);

    setGameOption('renderingStyle', 2);
    syncRenderingStyle();
    stub = stubEffect();
    bindToon(stub.effect, true);
    bindToon(stub.effect, false);
    expect(stub.setFloat4.mock.calls[0][3]).toBe(RENDERING_STYLES[2]?.rim);
    expect(stub.setFloat4.mock.calls[1][3]).toBe(0);
  });
});

describe('the GLSL helpers', () => {
  it('compile under the toon define only', () => {
    const glsl = toonFunctionsGlsl();
    expect(glsl).toContain('#ifdef MU_TOON');
    expect(glsl).toContain('muToonBands');
    expect(glsl).toContain('muToonStep');
    expect(glsl).toContain('fwidth');
  });
});
