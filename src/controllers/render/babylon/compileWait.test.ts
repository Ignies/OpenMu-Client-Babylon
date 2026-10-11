import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Effect } from './exports';
import { pauseCompileWaitWhileHidden } from './compileWait';

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
    pauseCompileWaitWhileHidden();
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

  it('still gives up after Babylon own wait while shown', () => {
    const effect = fake();
    check(effect);
    vi.advanceTimersByTime(29_000);
    expect(effect.errors).toHaveLength(0);
    vi.advanceTimersByTime(2_000);
    expect(effect.errors).toHaveLength(1);
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
