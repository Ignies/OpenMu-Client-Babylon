import {
  SimpleModulusEncryptor,
  SimpleModulusKeys,
} from '../../src/common/encryption/simpleModulus';
import { Xor32Encryptor } from '../../src/common/encryption/xor32';
import { gameVersion } from '../../versions/season6';

/**
 * Frames as the two ends put them on the wire, for the demo and the tests:
 * the client's way (`Store.sendToGS`: Xor32 over everything, SimpleModulus
 * for headers >= 0xC3) and the server's (SimpleModulus alone, with its own
 * key set). One encoder per fake socket, since the modulus counter runs per
 * stream.
 */

/** OpenMU `PipelinedSimpleModulusEncryptor.DefaultServerKey` - the public default. */
const SERVER_TO_CLIENT_ENCRYPTION_KEYS = [
  73326, 109989, 98843, 171058, 13169, 19036, 35482, 29587, 62004, 64409, 35374, 64599,
];

export class WireEncoder {
  private readonly clientModulus = new SimpleModulusEncryptor();
  private readonly serverModulus = new SimpleModulusEncryptor();
  private readonly xor32 = new Xor32Encryptor();

  constructor() {
    this.clientModulus.encryptionKeys = SimpleModulusKeys.CreateEncryptionKeys([
      ...gameVersion.protocol.encryption.clientToServer,
    ]);
    this.serverModulus.encryptionKeys = SimpleModulusKeys.CreateEncryptionKeys(
      SERVER_TO_CLIENT_ENCRYPTION_KEYS
    );
  }

  client(packet: Uint8Array): Uint8Array {
    const copy = packet.slice();
    this.xor32.Encrypt(copy);
    return copy[0] >= 0xc3 ? this.clientModulus.Encrypt(copy) : copy;
  }

  server(packet: Uint8Array): Uint8Array {
    const copy = packet.slice();
    return copy[0] >= 0xc3 ? this.serverModulus.Encrypt(copy) : copy;
  }
}

/** The bytes of a generated packet, whole. */
export function packetBytes(packet: { buffer: DataView }): Uint8Array {
  const view = packet.buffer;
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice();
}

/** A raw frame by hand: header, length, then the body. */
export function rawFrame(header: number, body: number[]): Uint8Array {
  const headerSize = header === 0xc2 || header === 0xc4 ? 3 : 2;
  const length = headerSize + body.length;
  const bytes = new Uint8Array(length);
  bytes[0] = header;
  if (headerSize === 2) {
    bytes[1] = length;
  } else {
    bytes[1] = length >> 8;
    bytes[2] = length & 0xff;
  }
  bytes.set(body, headerSize);
  return bytes;
}

/** A name padded with zeros to the wire's fixed width. */
export function nameBytes(name: string, width: number): number[] {
  const out = new Array<number>(width).fill(0);
  for (let i = 0; i < Math.min(width, name.length); i++) out[i] = name.charCodeAt(i) & 0xff;
  return out;
}
