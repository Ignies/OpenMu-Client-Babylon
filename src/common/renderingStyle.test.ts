import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Effect } from '../libs/babylon/exports';
import { GameOptions, setGameOption } from './gameOptions';
import {
  ANIME_HALFTONE_SCALE_MAX,
  ANIME_HALFTONE_SCALE_MIN,
  ANIME_SLIDER_MAX,
  LINE_STRENGTH_MAX,
  LINE_STRENGTH_MIN,
  LINE_PLACEMENT_MAX,
  LINE_WIDTH_MAX,
  LINE_WIDTH_MIN,
  OUTLINE_MODE_MAX,
  RENDERING_STYLES,
  RENDERING_STYLE_MAX,
  TOON_FILTER_UNIFORM,
  TOON_SHEEN_UNIFORM,
  TOON_ULTRA_UNIFORM,
  TOON_UNIFORM,
  animeFilmBoost,
  animeHalftoneScale,
  animeMatcap,
  animeOutlineMode,
  bindToon,
  hullOutlineActive,
  inkDarkness,
  inkLinesActive,
  inkSide,
  inkWidth,
  linePlacement,
  lineStrength,
  lineWidth,
  renderingStyle,
  shadeSteps,
  speedLineStrength,
  styleIndex,
  styleStrength,
  syncRenderingStyle,
  toonEffectsActive,
  toonFlatActive,
  toonFunctionsGlsl,
  toonGrassActive,
  toonRampActive,
  toonSheenActive,
  toonTerrainDefines,
  toonToneActive,
  toonUltraActive,
} from './renderingStyle';

const initial = {
  lightingQuality: GameOptions.lightingQuality,
  renderingStyle: GameOptions.renderingStyle,
  shadeSteps: GameOptions.shadeSteps,
  styleStrength: GameOptions.styleStrength,
  lineWidth: GameOptions.lineWidth,
  lineStrength: GameOptions.lineStrength,
  linePlacement: GameOptions.linePlacement,
  grassOutline: GameOptions.grassOutline,
  animeEffects: GameOptions.animeEffects,
  animeShading: GameOptions.animeShading,
  animeRim: GameOptions.animeRim,
  animeRimWidth: GameOptions.animeRimWidth,
  animeMatcap: GameOptions.animeMatcap,
  animePaint: GameOptions.animePaint,
  animeHalftone: GameOptions.animeHalftone,
  animeHalftoneScale: GameOptions.animeHalftoneScale,
  animeOutlineMode: GameOptions.animeOutlineMode,
  animeSpeedLines: GameOptions.animeSpeedLines,
  animeFilm: GameOptions.animeFilm,
  animeImpacts: GameOptions.animeImpacts,
};

const stubEffect = () => {
  const setFloat4 = vi.fn();
  const setFloat3 = vi.fn();
  return {
    effect: { setFloat4, setFloat3 } as unknown as Effect,
    setFloat4,
    setFloat3,
  };
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

    setGameOption('linePlacement', -2);
    expect(linePlacement()).toBe(0);
    setGameOption('linePlacement', 7);
    expect(linePlacement()).toBe(LINE_PLACEMENT_MAX);
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

  it('turns the placement into the side the pass draws on', () => {
    setGameOption('lightingQuality', 1);
    setGameOption('renderingStyle', 2);
    const sides = [1, 0, -1];
    for (let value = 0; value <= LINE_PLACEMENT_MAX; value++) {
      setGameOption('linePlacement', value);
      syncRenderingStyle();
      expect(inkSide()).toBe(sides[value]);
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
    expect(glsl).toContain('#ifdef MU_TOON_SHEEN');
    expect(glsl).toContain('#ifdef MU_TOON_TONE');
    expect(glsl).toContain('muToonBands');
    expect(glsl).toContain('muToonStep');
    expect(glsl).toContain('muToonFlat');
    expect(glsl).toContain('muToonMatcap');
    expect(glsl).toContain('muToonDots');
    expect(glsl).toContain('fwidth');
    expect(glsl).not.toMatch(/\/\/[^\n]*;/);
  });
});

/** Every 2.0 slider away from its default, for the identity check. */
const TUNED_AWAY = {
  animeShading: 0,
  animeRim: 9,
  animeRimWidth: 0,
  animeMatcap: 9,
  animePaint: 0,
  animeHalftone: 9,
  animeHalftoneScale: 9,
  animeOutlineMode: 2,
  animeSpeedLines: 9,
  animeFilm: 9,
} as const;

describe('Anime 2.0', () => {
  const tuned = () => {
    setGameOption('lightingQuality', 1);
    setGameOption('renderingStyle', 3);
  };

  it('is its own row, with the dial on 1.0 and the rig on 2.0', () => {
    expect(RENDERING_STYLES[2]).toMatchObject({ dialled: true, tuned: false });
    expect(RENDERING_STYLES[3]).toMatchObject({
      ramp: true,
      outline: true,
      flat: true,
      extras: false,
      dialled: false,
      tuned: true,
    });
  });

  it('leaves Anime 1.0 alone whatever its own sliders say', () => {
    setGameOption('lightingQuality', 2);
    setGameOption('renderingStyle', 2);
    syncRenderingStyle(900);

    const before = stubEffect();
    bindToon(before.effect, true);
    const baseline = before.setFloat4.mock.calls.map(call => [...call]);
    const flags = [
      toonRampActive(),
      toonFlatActive(),
      toonGrassActive(),
      toonEffectsActive(),
      toonUltraActive(),
      toonSheenActive(),
      toonToneActive(),
      inkLinesActive(),
      hullOutlineActive(),
    ];

    for (const [key, value] of Object.entries(TUNED_AWAY)) {
      setGameOption(key as keyof typeof TUNED_AWAY, value);
    }
    setGameOption('animeImpacts', false);
    syncRenderingStyle(900);

    const after = stubEffect();
    bindToon(after.effect, true);
    expect(after.setFloat4.mock.calls.map(call => [...call])).toEqual(baseline);
    expect(after.setFloat3).not.toHaveBeenCalled();
    expect([
      toonRampActive(),
      toonFlatActive(),
      toonGrassActive(),
      toonEffectsActive(),
      toonUltraActive(),
      toonSheenActive(),
      toonToneActive(),
      inkLinesActive(),
      hullOutlineActive(),
    ]).toEqual(flags);
    expect(animeFilmBoost()).toEqual({ bloom: 0, chromatic: 0, grain: 0 });
    expect(speedLineStrength()).toBe(0);
  });

  it('compiles nothing for a slider sitting at zero', () => {
    tuned();
    setGameOption('animeMatcap', 0);
    setGameOption('animeHalftone', 0);
    setGameOption('animePaint', 0);
    syncRenderingStyle();
    expect(toonSheenActive()).toBe(false);
    expect(toonToneActive()).toBe(false);
    expect(toonFlatActive()).toBe(false);
    expect(toonTerrainDefines()).toEqual(['#define MU_TOON_GRASS']);

    setGameOption('animeMatcap', 5);
    setGameOption('animeHalftone', 5);
    setGameOption('animePaint', 5);
    syncRenderingStyle();
    expect(toonSheenActive()).toBe(true);
    expect(toonToneActive()).toBe(true);
    expect(toonFlatActive()).toBe(true);
  });

  it('never compiles its two defines on any other style', () => {
    setGameOption('animeMatcap', 9);
    setGameOption('animeHalftone', 9);
    for (const style of [0, 1, 2]) {
      setGameOption('lightingQuality', 2);
      setGameOption('renderingStyle', style);
      syncRenderingStyle();
      expect(toonSheenActive()).toBe(false);
      expect(toonToneActive()).toBe(false);
    }
  });

  it('puts the sheen on the figures and the screentone on everyone', () => {
    tuned();
    setGameOption('animeMatcap', 9);
    setGameOption('animeHalftone', 6);
    setGameOption('animeHalftoneScale', 4);
    syncRenderingStyle(900);

    const { effect, setFloat4 } = stubEffect();
    bindToon(effect, true);
    bindToon(effect, false);
    const sheen = written(setFloat4, TOON_SHEEN_UNIFORM);
    expect(sheen).toHaveLength(2);
    expect(sheen[0][0]).toBeGreaterThan(0);
    expect(sheen[1][0]).toBe(0);
    expect(sheen[0][2]).toBe(sheen[1][2]);
    expect(sheen[0][2]).toBeGreaterThan(0);
    expect(sheen[0][3]).toBe(4);

    // The dot grid scales with the frame the way the grass outline does.
    syncRenderingStyle(1800);
    const big = stubEffect();
    bindToon(big.effect, false);
    expect(written(big.setFloat4, TOON_SHEEN_UNIFORM)[0][3]).toBe(8);
  });

  it('splits the outline between the pass and the hull', () => {
    tuned();
    const modes = [
      [0, false, false],
      [1, true, false],
      [2, false, true],
      [3, true, true],
    ] as const;

    for (const [mode, ink, hull] of modes) {
      setGameOption('animeOutlineMode', mode);
      syncRenderingStyle();
      expect(inkLinesActive()).toBe(ink);
      expect(hullOutlineActive()).toBe(hull);
    }

    // Every other style keeps the pass and never wears a hull.
    setGameOption('renderingStyle', 2);
    setGameOption('animeOutlineMode', 2);
    syncRenderingStyle();
    expect(inkLinesActive()).toBe(true);
    expect(hullOutlineActive()).toBe(false);
  });

  it('drops the grass outline and the effect tones with the lines', () => {
    tuned();
    setGameOption('grassOutline', true);
    setGameOption('animeEffects', true);
    setGameOption('animeOutlineMode', 0);
    syncRenderingStyle();
    expect(toonGrassActive()).toBe(false);
    expect(toonEffectsActive()).toBe(false);

    setGameOption('animeOutlineMode', 1);
    syncRenderingStyle();
    expect(toonGrassActive()).toBe(true);
    expect(toonEffectsActive()).toBe(true);
  });

  it('hardens the band edge as the shading grade rises', () => {
    tuned();
    const softAt = (value: number) => {
      setGameOption('animeShading', value);
      syncRenderingStyle();
      const { effect, setFloat4 } = stubEffect();
      bindToon(effect, false);
      return written(setFloat4, TOON_UNIFORM)[0][1];
    };

    expect(softAt(9)).toBe(0);
    expect(softAt(0)).toBeGreaterThan(softAt(5));
  });

  it('takes the rim strength and width from their own sliders', () => {
    tuned();
    const rimAt = (strength: number, width: number) => {
      setGameOption('animeRim', strength);
      setGameOption('animeRimWidth', width);
      syncRenderingStyle();
      const { effect, setFloat4 } = stubEffect();
      bindToon(effect, true);
      const bound = written(setFloat4, TOON_UNIFORM)[0];
      return { rim: bound[2], edge: bound[3] };
    };

    expect(rimAt(0, 5).rim).toBe(0);
    expect(rimAt(9, 5).rim).toBeGreaterThan(rimAt(3, 5).rim);
    // A wide rim switches on sooner, so its edge is the lower number.
    expect(rimAt(5, 9).edge).toBeLessThan(rimAt(5, 0).edge);
  });

  it('flattens the art further as the painterly slider rises', () => {
    tuned();
    const filterAt = (value: number) => {
      setGameOption('animePaint', value);
      syncRenderingStyle();
      const { effect, setFloat4 } = stubEffect();
      bindToon(effect, false);
      const bound = written(setFloat4, TOON_FILTER_UNIFORM)[0];
      return { bias: bound[0], levels: bound[1] };
    };

    const low = filterAt(1);
    const high = filterAt(9);
    expect(high.bias).toBeGreaterThan(low.bias);
    expect(high.levels).toBeLessThan(low.levels);
  });

  it('adds the cinematic trim only while it is the live style', () => {
    tuned();
    setGameOption('animeFilm', 0);
    expect(animeFilmBoost()).toEqual({ bloom: 0, chromatic: 0, grain: 0 });

    setGameOption('animeFilm', 9);
    const full = animeFilmBoost();
    expect(full.bloom).toBeGreaterThan(0);
    expect(full.chromatic).toBeGreaterThan(0);
    expect(full.grain).toBeGreaterThan(0);

    setGameOption('lightingQuality', 0);
    expect(animeFilmBoost()).toEqual({ bloom: 0, chromatic: 0, grain: 0 });
  });

  it('asks for speed lines only on its own style', () => {
    tuned();
    setGameOption('animeSpeedLines', 0);
    expect(speedLineStrength()).toBe(0);

    setGameOption('animeSpeedLines', 9);
    expect(speedLineStrength()).toBe(1);

    setGameOption('renderingStyle', 2);
    expect(speedLineStrength()).toBe(0);
  });

  it('rounds and clamps its own readers', () => {
    tuned();
    setGameOption('animeMatcap', 42);
    expect(animeMatcap()).toBe(ANIME_SLIDER_MAX);
    setGameOption('animeMatcap', -4);
    expect(animeMatcap()).toBe(0);

    setGameOption('animeHalftoneScale', 0);
    expect(animeHalftoneScale()).toBe(ANIME_HALFTONE_SCALE_MIN);
    setGameOption('animeHalftoneScale', 40);
    expect(animeHalftoneScale()).toBe(ANIME_HALFTONE_SCALE_MAX);

    setGameOption('animeOutlineMode', 9);
    expect(animeOutlineMode()).toBe(OUTLINE_MODE_MAX);
    setGameOption('animeOutlineMode', -1);
    expect(animeOutlineMode()).toBe(0);
  });
});
