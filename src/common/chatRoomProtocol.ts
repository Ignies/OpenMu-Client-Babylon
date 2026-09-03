import { Xor3Byte } from './encryption/xor3';

/**
 * The OpenMU ChatServer wire protocol (a separate TCP endpoint from the game
 * server, default port 55980). Plain C1/C2 frames, no SimpleModulus/Xor32;
 * only the auth token and message bodies are XOR'd with the 3-byte key
 * (FC CF AB), key index relative to the field start (Xor3Encryptor(offset)
 * in MUnique.OpenMU.Network).
 */

/** OpenMU's ChatServer listens here; the connection info packet carries no port. */
export const CHAT_SERVER_PORT = 55980;

export const MAX_CHAT_MESSAGE_BYTES = 250;

const NAME_LENGTH = 10;

export type ChatClient = { index: number; name: string };

export type ChatServerEvent =
  | { kind: 'joined'; index: number; name: string }
  | { kind: 'left'; index: number; name: string }
  | { kind: 'clients'; clients: ChatClient[] }
  | { kind: 'message'; senderIndex: number; text: string };

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function readName(bytes: Uint8Array, from: number): string {
  let end = from;
  const to = Math.min(from + NAME_LENGTH, bytes.length);
  while (end < to && bytes[end] !== 0 && bytes[end] !== 0x20) end++;
  return textDecoder.decode(bytes.subarray(from, end));
}

/** C1 00: room id + the token uint as a decimal string, XOR3 from offset 6. */
export function encodeAuthenticate(roomId: number, token: number): Uint8Array {
  const out = new Uint8Array(16);
  out[0] = 0xc1;
  out[1] = 16;
  out[2] = 0x00;
  out[4] = roomId & 0xff;
  out[5] = (roomId >> 8) & 0xff;
  const digits = String(token >>> 0);
  for (let i = 0; i < digits.length && i < NAME_LENGTH; i++) {
    out[6 + i] = digits.charCodeAt(i);
  }
  Xor3Byte(out.subarray(6));
  return out;
}

/** C1 01: sent before closing the connection. */
export function encodeLeave(): Uint8Array {
  return new Uint8Array([0xc1, 3, 0x01]);
}

/** C1 05: sent in a fixed interval so the server keeps the room alive. */
export function encodeKeepAlive(): Uint8Array {
  return new Uint8Array([0xc1, 3, 0x05]);
}

/** C1 04: sender index, message length, message bytes XOR3 from offset 5. */
export function encodeChatMessage(senderIndex: number, text: string): Uint8Array {
  let body = textEncoder.encode(text);
  if (body.length > MAX_CHAT_MESSAGE_BYTES) body = body.subarray(0, MAX_CHAT_MESSAGE_BYTES);
  const out = new Uint8Array(5 + body.length);
  out[0] = 0xc1;
  out[1] = out.length;
  out[2] = 0x04;
  out[3] = senderIndex;
  out[4] = body.length;
  out.set(body, 5);
  Xor3Byte(out.subarray(5));
  return out;
}

/**
 * One complete frame to an event, or null for anything unknown - which
 * includes the weather frame (C1 04 0F) the ws proxy injects into every
 * connection it carries.
 */
export function decodeChatServerFrame(frame: Uint8Array): ChatServerEvent | null {
  if (frame.length < 3) return null;

  if (frame[0] === 0xc2) {
    // C2 02 ChatRoomClients: count at 6, 11-byte {index, name[10]} rows at 8.
    if (frame[3] !== 0x02 || frame.length < 8) return null;
    const count = frame[6];
    const clients: ChatClient[] = [];
    for (let i = 0; i < count; i++) {
      const at = 8 + i * 11;
      if (at + 11 > frame.length) break;
      clients.push({ index: frame[at], name: readName(frame, at + 1) });
    }
    return { kind: 'clients', clients };
  }

  if (frame[0] !== 0xc1) return null;

  switch (frame[2]) {
    case 0x01: {
      // C1 01 00 joined / C1 01 01 left: index at 4, name at 5.
      if (frame.length < 15) return null;
      const index = frame[4];
      const name = readName(frame, 5);
      return frame[3] === 0x00
        ? { kind: 'joined', index, name }
        : frame[3] === 0x01
          ? { kind: 'left', index, name }
          : null;
    }
    case 0x04: {
      if (frame.length < 5) return null;
      const senderIndex = frame[3];
      const body = frame.slice(5, 5 + Math.min(frame[4], frame.length - 5));
      Xor3Byte(body);
      let end = body.length;
      while (end > 0 && body[end - 1] === 0) end--;
      return { kind: 'message', senderIndex, text: textDecoder.decode(body.subarray(0, end)) };
    }
    default:
      return null;
  }
}

/**
 * Incremental C1/C2 frame splitter for the chat socket's byte stream.
 * Non-header bytes are dropped one at a time to resync, like the game
 * socket's queue does.
 */
export class ChatFrameSplitter {
  private buffer: Uint8Array = new Uint8Array(0);

  push(bytes: Uint8Array): Uint8Array[] {
    if (this.buffer.length === 0) {
      this.buffer = bytes;
    } else {
      const combined = new Uint8Array(this.buffer.length + bytes.length);
      combined.set(this.buffer);
      combined.set(bytes, this.buffer.length);
      this.buffer = combined;
    }

    const frames: Uint8Array[] = [];
    while (this.buffer.length > 0) {
      const header = this.buffer[0];
      if (header !== 0xc1 && header !== 0xc2) {
        this.buffer = this.buffer.subarray(1);
        continue;
      }
      const headerSize = header === 0xc1 ? 2 : 3;
      if (this.buffer.length < headerSize + 1) break;
      const length =
        header === 0xc1
          ? this.buffer[1]
          : (this.buffer[1] << 8) | this.buffer[2];
      if (length < headerSize + 1) {
        this.buffer = this.buffer.subarray(1);
        continue;
      }
      if (this.buffer.length < length) break;
      frames.push(this.buffer.slice(0, length));
      this.buffer = this.buffer.subarray(length);
    }
    return frames;
  }
}
