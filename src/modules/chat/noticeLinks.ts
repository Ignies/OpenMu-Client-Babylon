/**
 * Links in a server notice, for the `noticeLinks` improvement (ours; the original draws the text as
 * it is). `<a href="https://...">label</a>` and a bare `https://...` become links; only http(s)
 * addresses do, and no other markup is read, so a notice can never put anything into the page.
 */

export type NoticeSegment = { text: string; href?: string };

const ANCHOR = /<a\s+href\s*=\s*(["'])(.*?)\1\s*>(.*?)<\/a>/gi;
const BARE_URL = /https?:\/\/[^\s<>"']+/gi;

/** The address when it is a web one, else null. */
function webHref(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Plain runs with their bare web addresses as links. */
function bareLinks(text: string, out: NoticeSegment[]): void {
  let last = 0;
  for (const m of text.matchAll(BARE_URL)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at) });
    const href = webHref(m[0]);
    out.push(href ? { text: m[0], href } : { text: m[0] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
}

/** The notice cut into plain runs and links, in order; neighbouring plain runs joined. */
export function parseNoticeLinks(text: string): NoticeSegment[] {
  const out: NoticeSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(ANCHOR)) {
    const at = m.index ?? 0;
    if (at > last) bareLinks(text.slice(last, at), out);
    const href = webHref(m[2]);
    out.push(href ? { text: m[3] || m[2], href } : { text: m[0] });
    last = at + m[0].length;
  }
  if (last < text.length) bareLinks(text.slice(last), out);

  const joined: NoticeSegment[] = [];
  for (const s of out) {
    const prev = joined[joined.length - 1];
    if (!s.text) continue;
    if (prev && !prev.href && !s.href) prev.text += s.text;
    else joined.push({ ...s });
  }
  return joined;
}

/** Whether the notice has a link to draw. */
export function hasNoticeLinks(text: string): boolean {
  return parseNoticeLinks(text).some(s => s.href);
}
