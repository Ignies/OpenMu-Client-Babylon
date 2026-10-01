/**
 * The low-life heartbeat as a chain of one-shots. `RenderLifeMana` re-issues
 * SOUND_HEART every frame while it is due, and its single busy channel turns
 * that into beats back to back; here each beat books the next for the moment
 * it ends, so nothing runs per frame and no two beats overlap.
 *
 * Store-free: the caller says when the beat is due and how to play one.
 */

/**
 * Wait before trying again when a beat did not start (channel still busy,
 * muted, not loaded): short, so a refused beat resumes about when the
 * original's per-frame re-issue would.
 */
export const HEARTBEAT_RETRY_MS = 150;

export class Heartbeat {
  private due = false;
  /** Pending while a beat sounds: the end of the beat is the next decision. */
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** `play` starts one beat and returns its length in ms, 0 when it did not start. */
  constructor(private readonly play: () => number) {}

  /** Whether the heart should be beating now. */
  set(due: boolean): void {
    this.due = due;
    if (due && this.timer === null) this.beat();
  }

  /** No further beats and no timer left behind: the page is going away. */
  stop(): void {
    this.due = false;
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  private readonly beat = (): void => {
    this.timer = null;
    if (!this.due) return;
    const ms = this.play();
    // Rounded up: a timer that fires inside the last fraction of a ms would
    // find the one channel still held and fall back to the retry.
    this.timer = setTimeout(this.beat, ms > 0 ? Math.ceil(ms) : HEARTBEAT_RETRY_MS);
  };
}
