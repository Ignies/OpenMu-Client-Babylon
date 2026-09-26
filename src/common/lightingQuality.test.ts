import { afterEach, describe, expect, it } from 'vitest';
import type { Camera, PostProcess } from '../libs/babylon/exports';
import { GameOptions, setGameOption } from './gameOptions';
import { MSAA_HEAD_ONLY, sceneTargetSamples } from './lightingQuality';

const pass = (): PostProcess => ({}) as PostProcess;

const chain = (
  ...passes: (PostProcess | null)[]
): Pick<Camera, '_postProcesses'> => ({ _postProcesses: passes });

describe('sceneTargetSamples', () => {
  const saved = {
    lightingQuality: GameOptions.lightingQuality,
    msaa: GameOptions.msaa,
  };

  afterEach(() => {
    setGameOption('lightingQuality', saved.lightingQuality);
    setGameOption('msaa', saved.msaa);
  });

  it('is on without the seam', () => {
    expect(MSAA_HEAD_ONLY).toBe(true);
  });

  it('multisamples the pass the scene is drawn into and nothing behind it', () => {
    setGameOption('lightingQuality', 1);
    setGameOption('msaa', 2);

    const ssao = pass();
    const tone = pass();
    const highlights = pass();
    const camera = chain(ssao, tone, highlights);

    expect(sceneTargetSamples(camera, ssao)).toBe(4);
    expect(sceneTargetSamples(camera, tone)).toBe(1);
    expect(sceneTargetSamples(camera, highlights)).toBe(1);
  });

  it('skips the holes a detach leaves', () => {
    setGameOption('lightingQuality', 2);
    setGameOption('msaa', 3);

    const entry = pass();
    const ssao = pass();
    const camera = chain(null, null, entry, null, ssao);

    expect(sceneTargetSamples(camera, entry)).toBe(8);
    expect(sceneTargetSamples(camera, ssao)).toBe(1);
  });

  it('gives a pass that is not on the camera one sample', () => {
    setGameOption('lightingQuality', 1);
    setGameOption('msaa', 2);

    expect(sceneTargetSamples(chain(pass()), pass())).toBe(1);
    expect(sceneTargetSamples(chain(), null)).toBe(1);
    expect(sceneTargetSamples(chain(null, null), null)).toBe(1);
  });

  it('keeps Classic at one sample whatever the slider says', () => {
    setGameOption('lightingQuality', 0);
    setGameOption('msaa', 3);

    const head = pass();

    expect(sceneTargetSamples(chain(head), head)).toBe(1);
  });
});
