import { matchServerText, translateServerText } from '@/i18n/serverText';

/** The reason line and the refusal arrive in the same burst; this is generous. */
const FRESH_MS = 2000;

/** The last blue system line the server sent (`ServerMessage` type 1), and when. */
let last: { text: string; at: number } | null = null;

export function noteServerLine(text: string, now = performance.now()): void {
  last = { text, at: now };
}

/**
 * OpenMU refuses an event entry with a bare `Failed`, which the original reads as a wrong ticket,
 * and says why in a system line just before (an item the event bars, a map requirement). That
 * line, translated, when it came a moment ago; null otherwise.
 */
export function entryRefusalReason(now = performance.now()): string | null {
  const line = last;
  last = null;
  if (!line || now - line.at > FRESH_MS) return null;
  const key = matchServerText(line.text)?.key;
  if (key !== 'serverMessage.cantEnterEventWithItem' && key !== 'serverMessage.missingMapRequirement') return null;
  return translateServerText(line.text);
}
