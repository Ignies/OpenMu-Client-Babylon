import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RENDER_SCALE_MAX,
  RENDER_SCALE_MIN,
  RENDER_SCALE_STEPS,
  RENDER_SCALE_STEP_MAX,
  applyRenderScale,
  clampRenderScale,
  renderScale,
  renderScaleForStep,
  resetRenderScale,
} from './renderScale';
import type { AbstractEngine } from './babylon/exports';

/** An engine that only remembers the level, the way Babylon's setter does. */
function fakeEngine(level = 1) {
  const state = { level };

  return {
    engine: {
      getHardwareScalingLevel: () => state.level,
      setHardwareScalingLevel: (v: number) => {
        state.level = v;
      },
    } as unknown as AbstractEngine,
    state,
  };
}

beforeEach(() => resetRenderScale());

describe('the slider stops', () => {
  it('starts at native', () => {
    expect(RENDER_SCALE_STEPS[0]).toBe(1);
  });

  it('only ever goes down', () => {
    for (let i = 1; i < RENDER_SCALE_STEPS.length; i++) {
      expect(RENDER_SCALE_STEPS[i]).toBeLessThan(RENDER_SCALE_STEPS[i - 1]);
    }
  });

  it('stays inside the range the clamp allows', () => {
    for (const step of RENDER_SCALE_STEPS) {
      expect(step).toBeGreaterThanOrEqual(RENDER_SCALE_MIN);
      expect(step).toBeLessThanOrEqual(RENDER_SCALE_MAX);
    }
  });

  it('holds a step off either end rather than reading past the table', () => {
    expect(renderScaleForStep(-3)).toBe(1);
    expect(renderScaleForStep(RENDER_SCALE_STEP_MAX + 9)).toBe(
      RENDER_SCALE_STEPS[RENDER_SCALE_STEP_MAX]
    );
    expect(renderScaleForStep(NaN)).toBe(1);
  });
});

describe('clampRenderScale', () => {
  it('keeps a sane value', () => {
    expect(clampRenderScale(0.75)).toBe(0.75);
  });

  it('refuses a scale that would be unreadable or larger than the window', () => {
    expect(clampRenderScale(0.01)).toBe(RENDER_SCALE_MIN);
    expect(clampRenderScale(4)).toBe(RENDER_SCALE_MAX);
  });

  it('treats nonsense as native', () => {
    expect(clampRenderScale(NaN)).toBe(1);
    expect(clampRenderScale(Infinity)).toBe(RENDER_SCALE_MAX);
  });
});

describe('applyRenderScale', () => {
  it('halves the resolution by doubling the level', () => {
    const { engine, state } = fakeEngine(1);

    applyRenderScale(engine, 0.5);

    expect(state.level).toBe(2);
    expect(renderScale()).toBe(0.5);
  });

  it('composes with the device ratio Babylon already picked', () => {
    // A 2x display: Babylon is already at 0.5 before anything here runs.
    const { engine, state } = fakeEngine(0.5);

    applyRenderScale(engine, 0.5);

    expect(state.level).toBe(1);
  });

  it('moves by the ratio between scales, not from scratch', () => {
    const { engine, state } = fakeEngine(1);

    applyRenderScale(engine, 0.5);
    applyRenderScale(engine, 0.75);

    expect(state.level).toBeCloseTo(1 / 0.75, 10);
  });

  it('keeps a level change made behind its back', () => {
    const { engine, state } = fakeEngine(1);

    applyRenderScale(engine, 0.5);
    // What `resize` does when the window moves to a 2x monitor.
    state.level *= 0.5;
    applyRenderScale(engine, 1);

    expect(state.level).toBe(0.5);
  });

  it('does nothing when the scale has not moved', () => {
    const { engine } = fakeEngine(1);
    const spy = vi.spyOn(engine, 'setHardwareScalingLevel');

    applyRenderScale(engine, 1);

    expect(spy).not.toHaveBeenCalled();
  });

  it('goes back to exactly native', () => {
    const { engine, state } = fakeEngine(1);

    applyRenderScale(engine, 0.6);
    applyRenderScale(engine, 1);

    expect(state.level).toBeCloseTo(1, 10);
  });
});
