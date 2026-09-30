/**
 * Chat text on the wire. The packet writers put one byte per character and
 * the readers make one character per byte, while OpenMU reads and writes
 * UTF-8. Sending a line as its UTF-8 bytes, one per character, and reading
 * the bytes back the same way is what lets accents, other alphabets and
 * emoji typed with the Windows picker reach the other players intact.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

/** The line as the string the packet writers turn into its UTF-8 bytes. */
export function toChatWire(text: string): string {
  let wire = '';
  for (const byte of encoder.encode(text)) wire += String.fromCharCode(byte);
  return wire;
}

/** A line a packet reader made, one character per byte, back to its text. */
export function fromChatWire(wire: string): string {
  if (!/[\x80-\xff]/.test(wire)) return wire;
  try {
    return decoder.decode(Uint8Array.from(wire, c => c.charCodeAt(0) & 0xff));
  } catch {
    // Not UTF-8 after all: show the bytes as they came.
    return wire;
  }
}

/** The first `max` characters, never half of an emoji's surrogate pair. */
export function clipChatText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}
