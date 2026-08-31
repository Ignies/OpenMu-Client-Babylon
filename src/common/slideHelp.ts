import { makeAutoObservable } from 'mobx';

/**
 * `CSlideHelpMgr` / `CUISlideHelp` (UIControls.cpp:4033-4530): the marquee
 * strip along the top of the screen. Two lanes — the *help* slide (`g_hFont`)
 * and the *notice* slide (`g_hFontBold`) — each with a queue of texts keyed
 * by the second they are due. `ReceiveNotice` feeds them from `ServerMessage`
 * types 10..15 (`AddSlide(Count, Delay, Text, Type - 10, Speed / 10, Color)`):
 * 0..2 go to the help lane, 3..5 to the notice lane, and within a lane the
 * sub-type 1 queues the text for right now, the others for
 * `currentSecond + i * Delay` per loop; sub-type 0 (`-1` after the shift)
 * is dropped if it sat in the queue for more than 60 s.
 *
 * A lane draws a black band (alpha `alphaRate - 25`, 1 px lines above and
 * below) at y = 0 and scrolls its text in from x = 640, accelerating at
 * 1 px/tick² to `Speed` px/tick (2.5 default) and decelerating while the
 * mouse rests on the band. `alphaRate` ramps 30/tick up to 205 while there is
 * text and back down when it has scrolled past its width; the text colour's
 * alpha is scaled by `(alphaRate + 50) / 255`. The local "help" tips file
 * (`OpenSlideTextFile`) is not shipped here, so the help lane is packet-only.
 */

export const SLIDE_STAGE_WIDTH = 640;
const TICKS_PER_SECOND = 25;
const MAX_LOOPS = 30;
const STALE_SECONDS = 60;
const ALPHA_STEP = 30;
const ALPHA_MAX = 205;
const ACCEL = 1;
const DEFAULT_SPEED = 2.5;

/** `(255 << 24) + (200 << 16) + (220 << 8) + 230`: R 230, G 220, B 200. */
export const DEFAULT_SLIDE_COLOR = 0xffc8dce6;

export type SlideLaneKind = 'help' | 'notice';

type QueuedSlide = {
  due: number;
  subType: number;
  text: string;
  color: number;
  speed: number;
};

export type SlideColor = { r: number; g: number; b: number; a: number };

/** `SetTextColor(DWORD)`: R + (G << 8) + (B << 16) + (A << 24). */
export function unpackSlideColor(color: number): SlideColor {
  return {
    r: color & 0xff,
    g: (color >>> 8) & 0xff,
    b: (color >>> 16) & 0xff,
    a: (color >>> 24) & 0xff,
  };
}

export class SlideLane {
  text = '';
  color: number = DEFAULT_SLIDE_COLOR;
  /** `m_fMovePosition`, in 640-wide stage pixels. */
  position = SLIDE_STAGE_WIDTH;
  speed = 0;
  maxSpeed = DEFAULT_SPEED;
  alphaRate = 0;
  hovered = false;
  /** Width of the current text in stage pixels; set by the renderer. */
  textWidth = 0;

  private queue: QueuedSlide[] = [];
  private currentSecond = 10;
  private secondAccumulator = 0;

  constructor(readonly kind: SlideLaneKind) {
    makeAutoObservable<this, 'queue' | 'currentSecond' | 'secondAccumulator'>(
      this,
      { queue: false, currentSecond: false, secondAccumulator: false }
    );
  }

  get hasText(): boolean {
    return this.text !== '';
  }

  get visible(): boolean {
    return this.alphaRate > 0;
  }

  /** `CUISlideHelp::AddSlide`. */
  add(
    loopCount: number,
    loopDelay: number,
    text: string,
    subType: number,
    speed: number,
    color: number
  ): void {
    if (!text || loopCount > MAX_LOOPS) return;

    for (let i = 0; i < loopCount; i++) {
      this.queue.push({
        due: subType === 1 ? 0 : this.currentSecond + i * loopDelay,
        subType,
        text,
        color,
        speed,
      });
    }
    this.queue.sort((a, b) => a.due - b.due);
  }

  clear(): void {
    this.queue = [];
    this.text = '';
    this.alphaRate = 0;
    this.position = SLIDE_STAGE_WIDTH;
    this.speed = 0;
  }

  /**
   * One frame: `ManageSlide` + the movement part of `Render` (`SlideMove`,
   * `ComputeSpeed`, the alpha ramps). `f` is `FPS_ANIMATION_FACTOR`.
   */
  tick(f: number, dtSeconds: number, enabled: boolean): void {
    this.manage(dtSeconds);

    const fadeOut = !this.hasText || !enabled;

    if (!fadeOut) {
      this.alphaRate = Math.min(ALPHA_MAX, this.alphaRate + ALPHA_STEP * f);
    } else {
      this.alphaRate = Math.max(0, this.alphaRate - ALPHA_STEP * f);
    }

    if (this.alphaRate <= 0 || fadeOut) return;

    // SlideMove: once the whole text has left the strip, drop it.
    if (this.position < -this.textWidth) {
      this.text = '';
      this.position = SLIDE_STAGE_WIDTH;
      return;
    }

    // ComputeSpeed.
    const accel = this.hovered ? -ACCEL : ACCEL;
    this.speed = Math.max(0, Math.min(this.maxSpeed, this.speed + accel * f));
    this.position -= this.speed * f;
  }

  /** `ManageSlide` + `CheckTime`: pull the next due text once the lane is empty. */
  private manage(dtSeconds: number): void {
    if (this.hasText) return;

    this.secondAccumulator += dtSeconds;
    while (this.secondAccumulator >= 1) {
      this.secondAccumulator -= 1;
      this.currentSecond++;
    }

    while (this.queue.length > 0) {
      const next = this.queue[0];
      if (next.due > this.currentSecond) break;
      this.queue.shift();

      // Sub-type -1 entries that went stale are skipped, not shown.
      if (next.subType === -1 && next.due + STALE_SECONDS < this.currentSecond) {
        continue;
      }

      this.text = next.text;
      this.color = next.color;
      this.maxSpeed = next.speed > 0 ? next.speed : DEFAULT_SPEED;
      this.position = SLIDE_STAGE_WIDTH;
      this.speed = 0;
      this.textWidth = 0;
      break;
    }
  }
}

export const SlideHelp = new (class _SlideHelp {
  readonly help = new SlideLane('help');
  readonly notice = new SlideLane('notice');

  /** `CSlideHelpMgr::AddSlide(Count, Delay, Text, Result - 10, Speed / 10, Color)`. */
  add(
    loopCount: number,
    loopDelay: number,
    text: string,
    type: number,
    speed: number,
    color: number = DEFAULT_SLIDE_COLOR
  ): void {
    if (!text || loopCount > MAX_LOOPS) return;

    if (type >= 0 && type <= 2) {
      this.help.add(loopCount, loopDelay, text, type - 1, speed, color);
    } else if (type >= 3 && type <= 5) {
      this.notice.add(loopCount, loopDelay, text, type - 4, speed, color);
    }
  }

  clear(): void {
    this.help.clear();
    this.notice.clear();
  }

  /**
   * `CSlideHelpMgr::Render` priority: the notice lane owns the strip while
   * it has text; the help lane only runs while the notice lane is dark.
   */
  tick(f: number, dtSeconds: number, enabled: boolean): void {
    this.notice.tick(f, dtSeconds, enabled && !this.help.visible);
    this.help.tick(f, dtSeconds, enabled && !this.notice.hasText);
  }

  /** `Delay` is a WORD of seconds, `Speed` a BYTE of tenths of a px/tick. */
  static readonly TICKS_PER_SECOND = TICKS_PER_SECOND;
})();
