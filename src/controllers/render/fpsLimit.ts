/**
 * The FPS limit (ours, a player setting): `GameOptions.fpsLimit` is an index into these, 0 the
 * uncapped browser rate the client always ran at. A cap only skips whole animation frames, so it
 * lands on what the monitor allows: 60 on a 144 Hz screen is a steady 60, 90 on 60 Hz stays 60.
 */
export const FPS_LIMIT_STEPS: readonly number[] = [0, 30, 45, 60, 90, 120, 144];

export const FPS_LIMIT_MAX = FPS_LIMIT_STEPS.length - 1;

export function fpsLimitForStep(step: number): number {
  return FPS_LIMIT_STEPS[Math.max(0, Math.min(FPS_LIMIT_MAX, step))] ?? 0;
}

/** Weight of the newest interval in `FramePacer.fps`. */
const FPS_SMOOTHING = 0.1;

/**
 * Paces the render loop to a limit. The due time is carried forward, not reset, so a cap that
 * does not divide the refresh rate (45 on 60 Hz) still averages right; 1 ms of slack keeps rAF
 * jitter from dropping every other frame when the cap equals the refresh rate. It also measures
 * the frames it lets through (`fps`): the engine's own count sees every animation frame.
 */
export class FramePacer {
  /** Frames let through per second, smoothed; 0 until two have passed. */
  fps = 0;
  private nextDue = 0;
  private lastDrawn = -1;

  due(now: number, limit: number): boolean {
    if (limit > 0) {
      const interval = 1000 / limit;
      if (now < this.nextDue - 1) return false;
      // More than a frame behind (a hitch, a hidden tab): start over.
      this.nextDue = now - this.nextDue > interval ? now + interval : this.nextDue + interval;
    }
    if (this.lastDrawn >= 0 && now > this.lastDrawn) {
      const rate = 1000 / (now - this.lastDrawn);
      this.fps = this.fps > 0 ? this.fps + (rate - this.fps) * FPS_SMOOTHING : rate;
    }
    this.lastDrawn = now;
    return true;
  }
}

/** The render loop's pacer (`app/boot.tsx`); its `fps` is what the readouts show. */
export const framePacer = new FramePacer();
