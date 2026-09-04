import { makeAutoObservable } from 'mobx';
import type { TextKey } from '../i18n';

/**
 * The golden server notice (ZzzInterface.cpp:491-603). `ReceiveNotice`
 * (WSclient.cpp:1605) routes `ServerMessage` by type: 0 is a notice, 1 goes
 * to the system log, 2 is a guild notice — `GlobalText[483]` wrapped, colour
 * 1 — which also lands in the guild window.
 *
 * The banner is a six-line stack (`MAX_NOTICE`) drawn centred at y = 300 +
 * 13·i in the 640×480 space with `g_hFontBold`. `CreateNotice` pushes at the
 * bottom and scrolls the rest up; a line wider than 256 px is cut in two at
 * the space nearest its middle (`CutText`). `MoveNotices` counts `NoticeTime`
 * down from 300 ticks (12 s at 25 tps) and, at zero, pushes an empty line so
 * old notices drift off the top; every push resets the timer. Colour 0 is
 * (255,200,80) blinking between alpha 128 and 255 every 5 ticks
 * (`NoticeInverse % 10 < 5`), colour 1 is (100,255,200); both sit on
 * black(128).
 */

export const MAX_NOTICE = 6;
export const NOTICE_LINE_HEIGHT = 13;
export const NOTICE_Y = 300;
export const NOTICE_MAX_WIDTH = 256;

const TICKS_PER_SECOND = 25;
const NOTICE_TIME_TICKS = 300;
export const NOTICE_BLINK_MS = (5 / TICKS_PER_SECOND) * 1000;
const NOTICE_TIME_MS = (NOTICE_TIME_TICKS / TICKS_PER_SECOND) * 1000;

export const NoticeColor = {
  Gold: 0,
  Guild: 1,
} as const;

export type NoticeLine = {
  text: string;
  color: number;
};

export const NOTICE_STYLE: Record<number, { color: string; blink: boolean }> = {
  [NoticeColor.Gold]: { color: 'rgb(255,200,80)', blink: true },
  [NoticeColor.Guild]: { color: 'rgb(100,255,200)', blink: false },
};

export const NOTICE_BACKGROUND = 'rgba(0,0,0,0.5)';

/** `GlobalText[483]`. */
export const GUILD_NOTICE_FORMAT: TextKey = 'guild.notice.prefix';

let measureContext: CanvasRenderingContext2D | null | undefined;

/** `GetTextExtentPoint32` with `g_hFontBold`, in 640×480 pixels. */
function measureNoticeWidth(text: string): number {
  if (measureContext === undefined) {
    measureContext = document.createElement('canvas').getContext('2d');
  }
  if (!measureContext) return text.length * 6;
  measureContext.font = '600 11px Tahoma, Verdana, sans-serif';
  return measureContext.measureText(text).width;
}

/** `CutText`: split at the last space before the middle, else the first after. */
export function cutNoticeText(text: string): [string, string] {
  const half = Math.floor(text.length / 2);
  let split = text.lastIndexOf(' ', half);
  if (split === -1) split = text.indexOf(' ', half);
  if (split === -1) return [text, ''];
  return [text.slice(0, split), text.slice(split + 1)];
}

export const Notices = new (class _Notices {
  lines: NoticeLine[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    makeAutoObservable<this, 'timer'>(this, { timer: false });
  }

  /** `CreateNotice(Text, Color)`. */
  create(text: string, color: number = NoticeColor.Gold): void {
    if (measureNoticeWidth(text) < NOTICE_MAX_WIDTH || !text.includes(' ')) {
      this.push(text, color);
    } else {
      const [top, bottom] = cutNoticeText(text);
      this.push(top, color);
      this.push(bottom, color);
    }
    this.restartTimer();
  }

  /** Type 2: `GlobalText[483]` around the text, colour 1. */
  createGuildNotice(text: string): void {
    this.create(GUILD_NOTICE_FORMAT.replace('%s', text), NoticeColor.Guild);
  }

  clear(): void {
    this.lines = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private push(text: string, color: number): void {
    // `ScrollNotice`: the stack holds MAX_NOTICE lines; the oldest drops.
    const next = [...this.lines, { text, color }];
    this.lines =
      next.length > MAX_NOTICE ? next.slice(next.length - MAX_NOTICE) : next;
  }

  /** `MoveNotices`: an empty line every NoticeTime ticks pushes the rest up. */
  private restartTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tick(), NOTICE_TIME_MS);
  }

  private tick(): void {
    this.timer = null;
    if (this.lines.every(line => line.text === '')) {
      // Nothing visible is left; stop rather than push blanks forever.
      this.lines = [];
      return;
    }
    this.push('', NoticeColor.Gold);
    this.restartTimer();
  }
})();
