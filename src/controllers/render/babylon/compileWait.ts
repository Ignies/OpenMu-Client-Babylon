import { Effect, EffectFallbacks } from './exports';
import { pageHidden } from '../../../core/utils';

/** Babylon's wait for a program: a check every 16 ms, 30 s of them (`Effect._checkIsReady`). */
const STEP_MS = 16;
const WAIT_MS = 30_000;
/** Past Babylon's wait, a slower check: the program is still on its way, not lost. */
const SLOW_STEP_MS = 250;

type WaitingEffect = {
  name: unknown;
  key?: string;
  _isDisposed: boolean;
  _isReadyInternal(): boolean;
  _processCompilationErrors(error: unknown, previousPipelineContext: unknown): void;
};

let patched = false;
let gpuSkinningKept = false;

/**
 * Babylon's wait for a compiling shader, without its give-up. Babylon counts 1875 checks and then
 * treats a program that is merely slow as failed: a material swaps in a reduced fallback (a skinned
 * one loses its bones) and an effect with none draws a dead program, the wedges, blackouts and stuck
 * grass on busy maps where the parallel compiler has a long queue. So the countdown pauses while
 * the page is hidden (a hidden page runs the checks once a second or slower and the GPU does not
 * compile for it), and past Babylon's wait the check only slows down and warns once.
 * A real compile error still ends it at once (`_isReadyInternal` throws it).
 */
export function patientCompileWait(): void {
  if (patched) return;
  patched = true;

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
      console.warn(`Shader ${String(name)} still compiling after ${WAIT_MS / 1000} s; waiting for it.`);
      const slow = setInterval(() => {
        if (ready()) clearInterval(slow);
      }, SLOW_STEP_MS);
    }, STEP_MS);
  };
}

/**
 * Babylon's CPU skinning fallback, off: it turns every skinned mesh on a failed effect to CPU
 * skinning for good, writing skinned positions into geometry the pass clones share, which then
 * skin them a second time (the wedge from the hero's hand). Bones live in a texture here, so the
 * fallback buys nothing; a failed skinned effect drops its next defines instead.
 */
export function keepGpuSkinning(): void {
  if (gpuSkinningKept) return;
  gpuSkinningKept = true;

  const proto = EffectFallbacks.prototype;
  const add = proto.addCPUSkinningFallback;
  proto.addCPUSkinningFallback = function (this: EffectFallbacks, rank: number) {
    add.call(this, rank, null as never);
  };
}
