import {
  SimpleModulusDecryptor,
  SimpleModulusEncryptor,
  SimpleModulusKeys,
} from '../../src/common/encryption/simpleModulus';
import { Xor32Encryptor } from '../../src/common/encryption/xor32';
import { getPacketSize, getSizeOfPacketType } from '../../src/common/wireUtils';
import { gameVersion } from '../../versions/season6';

/**
 * The bot speaks the game server's own protocol, so it encrypts and frames
 * exactly as the browser client does. Both directions are the client's side of
 * the pipe:
 *
 * - **Out** (`Store.sendToGS`): Xor32 over the whole packet, then SimpleModulus
 *   with the client-to-server keys, and only for headers >= 0xC3.
 * - **In** (`createSocket`'s queue): SimpleModulus with the server-to-client
 *   keys for headers >= 0xC3, and no Xor32 - that direction never has it.
 *
 * Getting either side backwards produces garbage that still frames correctly,
 * so `wire.test.ts` round-trips against the client's own encoders rather than
 * against hand-written bytes.
 */

/** C1/C3 carry a one-byte length, C2/C4 a two-byte one. */
export const HEADERS = new Set([0xc1, 0xc2, 0xc3, 0xc4]);

/** Above this the packet is encrypted; below it, plain. */
export const ENCRYPTED_FROM = 0xc3;

export class BotCrypto {
  private readonly encryptor = new SimpleModulusEncryptor();
  private readonly decryptor = new SimpleModulusDecryptor();
  private readonly xor32 = new Xor32Encryptor();

  constructor() {
    this.encryptor.encryptionKeys = SimpleModulusKeys.CreateEncryptionKeys([
      ...gameVersion.protocol.encryption.clientToServer,
    ]);
    this.decryptor.decryptionKeys = SimpleModulusKeys.CreateDecryptionKeys([
      ...gameVersion.protocol.encryption.serverToClient,
    ]);
  }

  /** A packet as the client would put it on the wire. Encrypts in place. */
  encrypt(packet: Uint8Array): Uint8Array {
    const header = packet[0];
    const xored = this.xor32.Encrypt(packet);
    return header >= ENCRYPTED_FROM ? this.encryptor.Encrypt(xored) : xored;
  }

  /**
   * One complete server frame, decrypted. Returns null when the frame could
   * not be decrypted, which the caller must treat as "drop it and carry on":
   * SimpleModulus is a stream with a counter, so a frame that fails leaves the
   * counter where it was and every later frame would fail with it.
   */
  decrypt(wire: Uint8Array): Uint8Array | null {
    if (wire[0] < ENCRYPTED_FROM) return wire;
    try {
      const [ok, decrypted] = this.decryptor.Decrypt(wire);
      return ok ? decrypted : null;
    } catch {
      return null;
    }
  }

  /** Why the last decrypt failed, for the log. */
  get lastError(): string | null {
    return this.decryptor.lastError ?? null;
  }
}

/**
 * Splits a TCP byte stream into whole MU frames.
 *
 * A socket hands over arbitrary chunks, so a frame can arrive in pieces or
 * several can arrive at once. Bytes that are not a header are dropped one at a
 * time to resync rather than jamming the stream.
 */
export class FrameReader {
  private buffer = new Uint8Array(0);

  push(chunk: Uint8Array): void {
    if (this.buffer.length === 0) {
      this.buffer = chunk.slice();
      return;
    }
    const merged = new Uint8Array(this.buffer.length + chunk.length);
    merged.set(this.buffer, 0);
    merged.set(chunk, this.buffer.length);
    this.buffer = merged;
  }

  /** Every complete frame available now, in order, as raw (still encrypted) wire. */
  *frames(): Generator<Uint8Array> {
    while (this.buffer.length > 0) {
      const header = this.buffer[0];

      if (!HEADERS.has(header)) {
        this.buffer = this.buffer.subarray(1);
        continue;
      }

      const headerSize = getSizeOfPacketType(header);
      if (this.buffer.length < headerSize + 1) return;

      const length = getPacketSize(this.buffer);
      if (length < headerSize + 1) {
        this.buffer = this.buffer.subarray(1);
        continue;
      }
      if (this.buffer.length < length) return;

      yield this.buffer.slice(0, length);
      this.buffer = this.buffer.subarray(length);
    }
  }
}

/** Code and sub-code of a decrypted frame, for dispatch. */
export function codeOf(packet: Uint8Array): { code: number; sub: number } {
  const index = getSizeOfPacketType(packet[0]) === 3 ? 3 : 2;
  return {
    code: packet[index] ?? -1,
    sub: packet.length > index + 1 ? packet[index + 1] : -1,
  };
}
