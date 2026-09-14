import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Effect } from '../libs/babylon/exports';
import { GameOptions, setGameOption } from './gameOptions';
import {
  LINE_STRENGTH_MAX,
  LINE_STRENGTH_MIN,
  LINE_WIDTH_MAX,
  LINE_WIDTH_MIN,
  RENDERING_STYLES,
  RENDERING_STYLE_MAX,
  TOON_FILTER_UNIFORM,
  TOON_ULTRA_UNIFORM,
  TOON_UNIFORM,
  bindToon,
  inkDarkness,
  inkWidth,
  lineStrength,
  lineWidth,
  renderingStyle,
  shadeSteps,
  styleIndex,
  styleStrength,
  syncRenderingStyle,
  toonEffectsActive,
  toonFlatActive,
  toonFunctionsGlsl,
  toonGrassActive,
  toonRampActive,
  toonTerrainDefines,
  toonUltraActive,
} from './renderingStyle';

const initial = {
  lightingQuality: GameOptions.lightingQuality,
  renderingStyle: GameOptions.renderingStyle,
  shadeSteps: GameOptions.shadeSteps,
  styleStrength: GameOptions.styleStrength,
  lineWidth: GameOptions.lineWidth,
  lineStrength: GameOptions.lineStrength,
  grassOutline: GameOptions.grassOutline,
  animeEffects: GameOptions.animeEffects,
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
    expect(RENDERING_STYLES[1]).toMatchObject({ ramp: true, rim: 0, outline: false, flat: false, extras: false });
    expect(RENDERING_STYLES[2]).toMatchObject({ ramp: true, outline: true, flat: true, extras: true });
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

    setGameOption('lineStrength', 0);
    expect(lineStrength()).toBe(LINE_STRENGTH_MIN);
    setGameOption('lineStrength', 12);
    expect(lineStrength()).toBe(LINE_STRENGTH_MAX);
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
    setGameOption('grassOutline', true);
    syncRenderingStyle();
    expect(toonRampActive()).toBe(true);
    expect(toonFlatActive()).toBe(true);
    expect(toonTerrainDefines()).toEqual(['#define MU_TOON_FLAT', '#define MU_TOON_GRASS']);

    setGameOption('renderingStyle', 1);
    syncRenderingStyle();
    expect(toonRampActive()).toBe(true);
    expect(toonFlatActive()).toBe(false);
    expect(toonTerrainDefines()).toEqual([]);

    setGameOption('renderingStyle', 0);
    syncRenderingStyle();
    expect(toonRampActive()).toBe(false);
  });

  it('gates the grass outline and the effects on their toggles and the Anime style', () => {
    setGameOption('lightingQuality', 1);
    setGameOption('renderingStyle', 2);
    setGameOption('grassOutline', true);
    setGameOption('animeEffects', true);
    syncRenderingStyle();
    expect(toonGrassActive()).toBe(true);
    expect(toonEffectsActive()).toBe(true);

    setGameOption('grassOutline', false);
    setGameOption('animeEffects', false);
    syncRenderingStyle();
    expect(toonGrassActive()).toBe(false);
    expect(toonEffectsActive()).toBe(false);
    expect(toonTerrainDefines()).toEqual(['#define MU_TOON_FLAT']);

    setGameOption('grassOutline', true);
    setGameOption('animeEffects', true);
    setGameOption('renderingStyle', 1);
    syncRenderingStyle();
    expect(toonGrassActive()).toBe(false);
    expect(toonEffectsActive()).toBe(false);

    setGameOption('renderingStyle', 2);
    setGameOption('lightingQuality', 0);
    syncRenderingStyle();
    expect(toonGrassActive()).toBe(false);
    expect(toonEffectsActive()).toBe(false);
  });

  it('compiles the Ultra extras on the Ultra tier with the Anime style alone', () => {
    setGameOption('renderingStyle', 2);
    setGameOption('lightingQuality', 1);
    syncRenderingStyle();
    expect(toonUltraActive()).toBe(false);

    setGameOption('lightingQuality', 2);
    syncRenderingStyle();
    expect(toonUltraActive()).toBe(true);

    setGameOption('renderingStyle', 1);
    syncRenderingStyle();
    expect(toonUltraActive()).toBe(false);
  });

  it('binds the highlight for the figures alone and the hatching for everyone', () => {
    setGameOption('renderingStyle', 2);
    setGameOption('lightingQuality', 2);
    syncRenderingStyle();

    const { effect, setFloat4 } = stubEffect();
    bindToon(effect, true);
    bindToon(effect, false);
    const ultra = written(setFloat4, TOON_ULTRA_UNIFORM);
    expect(ultra).toHaveLength(2);
    expect(ultra[0][0]).toBeGreaterThan(0);
    expect(ultra[1][0]).toBe(0);
    expect(ultra[0][2]).toBe(ultra[1][2]);
    expect(ultra[0][2]).toBeGreaterThan(0);

    setGameOption('lightingQuality', 1);
    syncRenderingStyle();
    const enhanced = stubEffect();
    bindToon(enhanced.effect, true);
    expect(written(enhanced.setFloat4, TOON_ULTRA_UNIFORM)).toEqual([]);
  });

  it('hands the grass its outline width in pixels, scaled with the frame', () => {
    setGameOption('renderingStyle', 2);
    setGameOption('lightingQuality', 1);
    setGameOption('lineWidth', 3);
    setGameOption('grassOutline', true);

    syncRenderingStyle(900);
    let stub = stubEffect();
    bindToon(stub.effect, false);
    expect(written(stub.setFloat4, TOON_FILTER_UNIFORM)[0][3]).toBe(3);

    syncRenderingStyle(1800);
    stub = stubEffect();
    bindToon(stub.effect, false);
    expect(written(stub.setFloat4, TOON_FILTER_UNIFORM)[0][3]).toBe(6);
  });

  it('leaves the ink lines to their own sliders and keeps the rim', () => {
    setGameOption('lightingQuality', 1);
    setGameOption('renderingStyle', 2);
    setGameOption('lineWidth', 2);
    setGameOption('lineStrength', 5);

    const at = (strength: number) => {
      setGameOption('styleStrength', strength);
      syncRenderingStyle();
      const { effect, setFloat4 } = stubEffect();
      bindToon(effect, true);
      const rim = written(setFloat4, TOON_UNIFORM)[0][2];
      return { dark: inkDarkness(), width: inkWidth(), rim };
    };
    const low = at(1);
    const high = at(9);

    expect(high.dark).toBe(low.dark);
    expect(high.width).toBe(low.width);
    expect(high.rim).toBeGreaterThan(low.rim);
  });

  it('turns the line strength into darkness, black at the top', () => {
    setGameOption('lightingQuality', 1);
    setGameOption('renderingStyle', 2);
    const expected = [[LINE_STRENGTH_MIN, 0.2], [5, 0.6], [LINE_STRENGTH_MAX, 1]];
    for (const [value, darkness] of expected) {
      setGameOption('lineStrength', value);
      syncRenderingStyle();
      expect(inkDarkness()).toBeCloseTo(darkness, 6);
    }
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
    expect(glsl).toContain('#if defined(MU_TOON) || defined(MU_TOON_FLAT) || defined(MU_TOON_GRASS)');
    expect(glsl).toContain('#ifdef MU_TOON_FLAT');
    expect(glsl).toContain('muToonBands');
    expect(glsl).toContain('muToonStep');
    expect(glsl).toContain('muToonFlat');
    expect(glsl).toContain('fwidth');
    expect(glsl).not.toMatch(/\/\/[^\n]*;/);
  });
});
