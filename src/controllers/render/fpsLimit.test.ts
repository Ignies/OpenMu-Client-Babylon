import { describe, expect, it } from 'vitest';
import { FPS_LIMIT_MAX, FPS_LIMIT_STEPS, FramePacer, fpsLimitForStep } from './fpsLimit';

/** Frames drawn in one second of a `hz` monitor under `limit`, and the pacer that drew them. */
function run(hz: number, limit: number): { drawn: number; pacer: FramePacer } {
  const pacer = new FramePacer();
  let drawn = 0;
  for (let i = 0; i < hz; i++) if (pacer.due((i * 1000) / hz, limit)) drawn++;
  return { drawn, pacer };
}

describe('the FPS limit', () => {
  it('starts uncapped and clamps its steps', () => {
    expect(FPS_LIMIT_STEPS[0]).toBe(0);
    expect(fpsLimitForStep(-3)).toBe(0);
    expect(fpsLimitForStep(99)).toBe(FPS_LIMIT_STEPS[FPS_LIMIT_MAX]);
  });

  it('draws every frame when uncapped', () => {
    expect(run(144, 0).drawn).toBe(144);
  });

  it('caps to the limit on a faster monitor', () => {
    expect(Math.abs(run(144, 60).drawn - 60)).toBeLessThanOrEqual(1);
    expect(run(60, 30).drawn).toBe(30);
  });

  it('averages a cap that does not divide the refresh rate', () => {
    expect(Math.abs(run(60, 45).drawn - 45)).toBeLessThanOrEqual(1);
  });

  it('drops no frame when the cap equals the refresh rate', () => {
    expect(run(60, 60).drawn).toBe(60);
  });

  it('measures the frames it lets through', () => {
    expect(Math.abs(run(144, 60).pacer.fps - 60)).toBeLessThan(3);
    expect(Math.abs(run(120, 0).pacer.fps - 120)).toBeLessThan(3);
  });
});
