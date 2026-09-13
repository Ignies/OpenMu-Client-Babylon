import { makeAutoObservable, observable } from 'mobx';
import { EventBus } from '../libs/eventBus';
import { Store } from '../store';
import { clampAmount, nextStep } from './statAmounts';
import type { StatType } from './characterStats';

/**
 * "Add 200 points to Strength": the run behind the amount box in the
 * character info window.
 *
 * `IncreaseCharacterStatPoint` carries no amount - the wire only ever adds
 * one point - so this is the same shape as the arrange and bulk-move runs
 * (`inventorySort.ts`, `bulkMove.ts`): one request in flight, the next one
 * sent when the server has answered the last. Nothing new goes out.
 *
 * One writer: this module owns the run, the windows only read it.
 */

/** A step with no answer this long is a lost request; the run ends. */
const STEP_TIMEOUT = 5000;

export type StatRun = {
  stat: StatType;
  /** Requests sent so far. */
  sent: number;
  /** Points the server has confirmed. */
  added: number;
  /** Points asked for when the run started. */
  wanted: number;
};

export const StatAllocation = new (class _StatAllocation {
  run: StatRun | null = null;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private detach: (() => void) | null = null;

  constructor() {
    // The run is swapped whole rather than mutated: a reader only ever sees a
    // consistent { sent, added } pair.
    makeAutoObservable<this, 'timer' | 'detach'>(this, {
      run: observable.ref,
      timer: false,
      detach: false,
    });
  }

  get running(): boolean {
    return this.run !== null;
  }

  /** True while `stat`'s own row is the one being filled. */
  isRunning(stat: StatType): boolean {
    return this.run?.stat === stat;
  }

  start(stat: StatType, amount: number): void {
    if (this.run) {
      this.cancel();
      return;
    }

    const wanted = clampAmount(amount, Store.playerData.points);
    if (wanted <= 0) return;

    this.run = { stat, sent: 0, added: 0, wanted };
    this.listen();
    this.step();
  }

  cancel(): void {
    this.clearTimer();
    this.detach?.();
    this.detach = null;
    this.run = null;
  }

  private listen(): void {
    const answered = (e: { stat: number; added: number }) => this.onAnswer(e);
    const lost = () => this.cancel();

    EventBus.on('statPointAnswered', answered);
    EventBus.on('warpCompleted', lost);
    EventBus.on('wsClosed', lost);

    this.detach = () => {
      EventBus.off('statPointAnswered', answered);
      EventBus.off('warpCompleted', lost);
      EventBus.off('wsClosed', lost);
    };
  }

  private step(): void {
    const run = this.run;
    if (!run) return;

    if (nextStep(run, Store.playerData.points) !== 'send') {
      this.cancel();
      return;
    }

    this.run = { ...run, sent: run.sent + 1 };
    this.armTimer();
    Store.increaseStatRequest(run.stat);
  }

  private onAnswer(answer: { stat: number; added: number }): void {
    const run = this.run;
    if (!run || answer.stat !== run.stat) return;

    this.clearTimer();

    // A refused point means the server will refuse the rest too.
    if (answer.added <= 0) {
      this.cancel();
      return;
    }

    this.run = { ...run, added: run.added + answer.added };
    this.step();
  }

  private armTimer(): void {
    this.clearTimer();
    this.timer = setTimeout(() => this.cancel(), STEP_TIMEOUT);
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }
})();
