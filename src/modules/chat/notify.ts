import { playUiSound } from '@/controllers/sound';

/**
 * The line's kind: `info` is `TYPE_SYSTEM_MESSAGE`, `error` is
 * `TYPE_ERROR_MESSAGE` of `g_pSystemLogBox->AddText`.
 */
export type NotificationType = 'info' | 'error';

type Sink = (text: string, type: NotificationType) => void;

/** The system log that takes the lines (`Social`, set when social.ts loads). */
let sink: Sink | null = null;

export function setNotificationSink(next: Sink): void {
  sink = next;
}

/**
 * Client-side feedback, the way the original gives it: a line in the
 * system log at the bottom left (`g_pSystemLogBox->AddText`, blue for
 * `TYPE_SYSTEM_MESSAGE`, red for `TYPE_ERROR_MESSAGE`) and the error
 * sound. Server notices never come through here - `ServerMessage` type 0
 * goes to the golden banner (`Notices.create`). The third argument is the
 * retired toast's delay, kept so no caller changes.
 */
export function addNotification(text: string, type: NotificationType = 'info', _delay = 0): void {
  if (type === 'error') playUiSound('error');
  sink?.(text, type);
}
