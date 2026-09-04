import { castToByte } from './binaryUtils';

/**
 * Packet framing and the numeric casts the protocol layer needs, with no
 * Babylon and no DOM behind them.
 *
 * Split out of `utils.ts` for the same reason `binaryUtils.ts` was: that file
 * imports `Scene` / `Texture`, so anything reaching for `getPacketSize` used to
 * drag the whole engine along. The proxy (`proxy/presence.ts`) runs under Bun
 * with no browser at all and needs exactly these functions. `utils.ts`
 * re-exports everything here, so client code can keep importing it from there.
 */

export function byteToString(i: number) {
  return i.toString(16).padStart(2, '0').toUpperCase();
}

export function getSizeOfPacketType(packetType: number) {
  switch (packetType) {
    case 0xc1:
    case 0xc3:
      return 2;
    case 0xc2:
    case 0xc4:
      return 3;
    default:
      return 0;
  }
}

export function getPacketHeaderSize(packet: Uint8Array) {
  const t = packet[0];

  return getSizeOfPacketType(t);
}

export function getPacketSize(packet: Uint8Array) {
  switch (packet[0]) {
    case 0xc1:
    case 0xc3:
      return packet[1];
    case 0xc2:
    case 0xc4:
      return (packet[1] << 8) | packet[2];
    default:
      return 0;
  }
}

export function setPacketSize(packet: Uint8Array) {
  const size = packet.byteLength;
  switch (packet[0]) {
    case 0xc1:
    case 0xc3:
      packet[1] = castToByte(size);
      break;
    case 0xc2:
    case 0xc4:
      packet[1] = castToByte((size & 0xff00) >> 8);
      packet[2] = castToByte(size & 0x00ff);
      break;
    default:
      throw new Error(`Unknown packet type 0x${byteToString(packet[0])}`);
  }
}

export function stringToBytes(str: string, count = str.length) {
  const bytes = new Uint8Array(count);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}

export function castToUInt(n: number): UInt {
  return n; //TODO
}

export function castToUShort(n: number): UShort {
  return n; //TODO
}

export function integerDevision(n: number) {
  return Math.floor(n);
}
