import { Effect } from './exports';
import { pageHidden } from '../../../core/utils';

/** Babylon's wait for a program: a check every 16 ms, 30 s of them (`Effect._checkIsReady`). */
const STEP_MS = 16;
const WAIT_MS = 30_000;

type WaitingEffect = {
  name: unknown;
  key?: string;
  _isDisposed: boolean;
  _isReadyInternal(): boolean;
  _processCompilationErrors(error: unknown, previousPipelineContext: unknown): void;
};

let paused = false;

/**
 * Babylon's wait for a compiling shader, with its countdown paused while the page is hidden. It
 * counts checks, not time, and a hidden page runs them once a second or slower while the GPU does
 * not compile for it, so a long AFK gave the shader up and the materials came back black.
 * A real compile error still ends it at once (`_isReadyInternal` throws it).
 */
export function pauseCompileWaitWhileHidden(): void {
  if (paused) return;
  paused = true;

  const proto = Effect.prototype as unknown as { _checkIsReady(previous: unknown): void };
  proto._checkIsReady = function (this: WaitingEffect, previousPipelineContext: unknown) {
    const ready = (): boolean => {
      try {
        return this._isReadyInternal() || this._isDisposed;
      } catch (error) {
        this._processCompilationErrors(error, previousPipelineContext);
        return true;
      }
    };
    if (ready()) return;

    let left = WAIT_MS;
    const timer = setInterval(() => {
      if (ready()) {
        clearInterval(timer);
        return;
      }
      if (pageHidden()) return;
      left -= STEP_MS;
      if (left >= 0) return;
      clearInterval(timer);
      const name = typeof this.name === 'string' ? this.name : this.key;
      this._processCompilationErrors(new Error(`Operation timed out after maximum retries.  - Effect: ${name}`), previousPipelineContext);
    }, STEP_MS);
  };
}
