import { makeAutoObservable, reaction, runInAction } from 'mobx';
import { EventBus } from '../libs/eventBus';
import { Store } from '../store';

/**
 * What this sitting has been worth: experience, kills and zen since the
 * counter was last reset, and the rates they imply.
 *
 * Everything here is derived from packets the client already handles -
 * `ExperienceGained` for the exp and the killing blow, the money field for
 * the zen - so it costs one event listener and one reaction. The clock only
 * runs while the tracker is on screen (`tick`), so a closed panel is idle.
 */

const MS_PER_HOUR = 3_600_000;

export const SessionStats = new (class _SessionStats {
  /** Wall clock of the last reset. */
  startedAt = Date.now();
  /** Re-read once a second by the panel, so the elapsed line moves. */
  now = Date.now();

  experience = 0;
  kills = 0;
  zen = 0;

  private money = 0;
  private watching = false;

  constructor() {
    makeAutoObservable(this);
  }

  get elapsedMs(): number {
    return Math.max(0, this.now - this.startedAt);
  }

  private perHour(total: number): number {
    const ms = this.elapsedMs;
    // Under a minute the rates swing wildly; the panel prints a dash.
    return ms < 60_000 ? 0 : (total * MS_PER_HOUR) / ms;
  }

  get experiencePerHour(): number {
    return this.perHour(this.experience);
  }

  get killsPerHour(): number {
    return this.perHour(this.kills);
  }

  get zenPerHour(): number {
    return this.perHour(this.zen);
  }

  /**
   * Milliseconds to the next level at the running rate, or null when there
   * is nothing to go on yet (no rate, or the bar is already full).
   */
  get msToLevel(): number | null {
    const rate = this.experiencePerHour;
    if (rate <= 0) return null;

    const { exp, expToNextLvl } = Store.playerData;
    const remaining = expToNextLvl - exp;
    if (remaining <= 0) return null;

    return (remaining / rate) * MS_PER_HOUR;
  }

  reset(): void {
    runInAction(() => {
      this.startedAt = Date.now();
      this.now = this.startedAt;
      this.experience = 0;
      this.kills = 0;
      this.zen = 0;
      this.money = Store.playerData.money;
    });
  }

  /** Called once a second while the panel is open. */
  tick(): void {
    runInAction(() => {
      this.now = Date.now();
    });
  }

  /**
   * Start counting. Idempotent, and called from the panel rather than at
   * import time so a client that never opens it never listens.
   */
  watch(): void {
    if (this.watching) return;
    this.watching = true;
    this.money = Store.playerData.money;

    EventBus.on('experienceGained', ({ added, killedNetId }) => {
      runInAction(() => {
        this.experience += added;
        // The killing blow is the client's own (`quests/killCounters.ts`
        // reads the same field); a share from a party mate carries none.
        if (killedNetId) this.kills++;
      });
    });

    // Zen has no packet of its own - every source writes the same field -
    // so income is the rises of it. Spending is not counted: this is a
    // "what did the hunt bring in" line, not a balance sheet.
    reaction(
      () => Store.playerData.money,
      money => {
        const gained = money - this.money;
        this.money = money;
        if (gained > 0) runInAction(() => (this.zen += gained));
      }
    );

    // A different character is a different session.
    reaction(
      () => Store.playerData.name,
      () => this.reset()
    );
  }
})();
