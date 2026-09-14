import {
  SimpleModulusDecryptor,
  SimpleModulusKeys,
} from '../../src/common/encryption/simpleModulus';
import { Xor32Decryptor } from '../../src/common/encryption/xor32';
import { getPacketSize, getSizeOfPacketType } from '../../src/common/wireUtils';
import { gameVersion } from '../../versions/season6';

/**
 * One direction of one socket, turned from bytes into decrypted frames.
 *
 * The client encrypts with Xor32 and then SimpleModulus for headers >= 0xC3
 * (`Store.sendToGS`); the server uses SimpleModulus alone with the other key
 * set (`createSocket.ts`). C1 and C2 are plain both ways. Every frame handed
 * out is a copy: the bytes the proxy forwards are never touched.
 *
 * A frame that does not decrypt is dropped and the stream carries on - the
 * decryptor's counter resyncs on the next one, as the client's does.
 */

export type Direction = 'client' | 'server';

export type Frame = {
  /** The wire header byte: C1..C4. */
  header: number;
  code: number;
  /** The byte after the code, or -1 for a frame too short to have one. */
  subCode: number;
  /** The decrypted packet, header included, starting at byte 0. */
  view: DataView;
  bytes: Uint8Array;
};

const HEADERS = new Set([0xc1, 0xc2, 0xc3, 0xc4]);

/** Bounds what one connection can make the reader buffer. */
const MAX_QUEUE = 1 << 16;

const EMPTY = new Uint8Array(0);

export class FrameReader {
  private queue: Uint8Array = EMPTY;
  private readonly modulus = new SimpleModulusDecryptor();
  private readonly xor32: Xor32Decryptor | null;

  constructor(readonly direction: Direction) {
    if (direction === 'server') {
      this.modulus.decryptionKeys = SimpleModulusKeys.CreateDecryptionKeys([
        ...gameVersion.protocol.encryption.serverToClient,
      ]);
      this.xor32 = null;
    } else {
      // The decryptor's default keys are the server's side of the
      // client-to-server direction, which is exactly this.
      this.xor32 = new Xor32Decryptor();
    }
  }

  feed(chunk: Uint8Array, onFrame: (frame: Frame) => void): void {
    if (this.queue.length + chunk.length > MAX_QUEUE) this.queue = EMPTY;

    const merged = new Uint8Array(this.queue.length + chunk.length);
    merged.set(this.queue, 0);
    merged.set(chunk, this.queue.length);
    this.queue = merged;

    while (this.queue.length > 0) {
      const header = this.queue[0];

      if (!HEADERS.has(header)) {
        this.queue = this.queue.subarray(1);
        continue;
      }

      const headerSize = getSizeOfPacketType(header);
      if (this.queue.length < headerSize + 1) break;

      const length = getPacketSize(this.queue);
      if (length < headerSize + 1) {
        this.queue = this.queue.subarray(1);
        continue;
      }
      if (this.queue.length < length) break;

      const wire = this.queue.slice(0, length);
      this.queue = this.queue.subarray(length);

      const frame = this.decode(header, headerSize, wire);
      if (frame) onFrame(frame);
    }

    // Drop the consumed prefix rather than growing a view over a dead buffer.
    if (this.queue.length === 0) this.queue = EMPTY;
  }

  private decode(header: number, headerSize: number, wire: Uint8Array): Frame | null {
    let bytes = wire;

    if (header >= 0xc3) {
      try {
        const [ok, decrypted] = this.modulus.Decrypt(wire);
        if (!ok) return null;
        bytes = decrypted;
      } catch {
        return null;
      }
    }
    // The client XORs every frame, plain headers included (Store.sendToGS).
    if (this.xor32) this.xor32.Decrypt(bytes);

    const codeIndex = headerSize === 3 ? 3 : 2;
    if (bytes.length <= codeIndex) return null;

    // The generated packet classes read view-relative offsets from 0.
    const copy = bytes.slice(0, bytes.length);
    const view = new DataView(copy.buffer, copy.byteOffset, copy.byteLength);

    return {
      header,
      code: bytes[codeIndex],
      subCode: bytes.length > codeIndex + 1 ? bytes[codeIndex + 1] : -1,
      view,
      bytes: copy,
    };
  }
}
