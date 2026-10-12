import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Effect, EffectFallbacks } from './exports';
import { keepGpuSkinning, patientCompileWait } from './compileWait';

type Fake = {
  ready: boolean;
  errors: unknown[];
  name: string;
  _isDisposed: boolean;
  _isReadyInternal(): boolean;
  _processCompilationErrors(error: unknown): void;
};

const fake = (): Fake => ({
  ready: false,
  errors: [],
  name: 'test',
  _isDisposed: false,
  _isReadyInternal() {
    return this.ready;
  },
  _processCompilationErrors(error) {
    this.errors.push(error);
  },
});

const check = (effect: Fake) =>
  (Effect.prototype as unknown as { _checkIsReady(this: Fake, previous: unknown): void })._checkIsReady.call(effect, null);

// Babylon counts its 1875 checks, not time: a hidden page runs them once a second or slower.
describe('the shader compile wait', () => {
  let hidden = false;
  beforeEach(() => {
    vi.useFakeTimers();
    hidden = false;
    vi.stubGlobal('document', {
      get hidden() {
        return hidden;
      },
    });
    patientCompileWait();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not give a shader up while the page is hidden', () => {
    const effect = fake();
    hidden = true;
    check(effect);
    vi.advanceTimersByTime(60 * 60_000);
    expect(effect.errors).toHaveLength(0);
    hidden = false;
    effect.ready = true;
    vi.advanceTimersByTime(16);
    expect(effect.errors).toHaveLength(0);
  });

  // A slow compile is not a failed one: giving up swapped in a fallback (bones dropped) or left
  // the mesh drawing a dead program, the wedges and blackouts on busy maps.
  it('keeps waiting for a slow compile while shown, and the shader still arrives', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const effect = fake();
    check(effect);
    vi.advanceTimersByTime(10 * 60_000);
    expect(effect.errors).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(1);
    effect.ready = true;
    vi.advanceTimersByTime(1_000);
    expect(effect.errors).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    warn.mockRestore();
  });

  it('still reports a real compile error that shows up late', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const effect = fake();
    check(effect);
    vi.advanceTimersByTime(60_000);
    effect._isReadyInternal = () => {
      throw new Error('bad shader');
    };
    vi.advanceTimersByTime(1_000);
    expect(effect.errors).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops waiting for a disposed effect', () => {
    const effect = fake();
    check(effect);
    effect._isDisposed = true;
    vi.advanceTimersByTime(1_000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports a real compile error at once', () => {
    const effect = fake();
    effect._isReadyInternal = () => {
      throw new Error('bad shader');
    };
    check(effect);
    expect(effect.errors).toHaveLength(1);
  });
});

// Babylon's CPU skinning fallback writes skinned positions into geometry the pass clones share.
describe('a failed skinned effect', () => {
  it('keeps the mesh skinning on the GPU and drops the next defines instead', () => {
    keepGpuSkinning();
    const mesh = { computeBonesUsingShaders: true, numBoneInfluencers: 4 };
    const fallbacks = new EffectFallbacks();
    fallbacks.addFallback(0, 'FOG');
    fallbacks.addCPUSkinningFallback(0, mesh as never);
    const defines = fallbacks.reduce('#define NUM_BONE_INFLUENCERS 4\n#define FOG\n', {} as never);
    expect(mesh.computeBonesUsingShaders).toBe(true);
    expect(defines).toBe('#define NUM_BONE_INFLUENCERS 4\n\n');
  });
});
