/**
 * C1 B1 00 - `ReceiveChangeMapServerInfo` (WSclient.cpp:10328): the server
 * moves the player to the game server hosting the destination map (split
 * deployments; Kalima and friends). OpenMU's generated protocol has no packet
 * for it, so this is hand-written from the original struct
 * (`PHEADER_MAP_CHANGESERVER_INFO`: a 4-byte header, then `MapServerInfo`
 * aligned to offset 4 - ip[16], port u16, server code u16, four join auth
 * codes u32, all little-endian).
 */
export class ChangeMapServerInfoPacket {
  buffer!: DataView;
  static readonly Name = 'ChangeMapServerInfo';
  static readonly HeaderType = 'C1HeaderWithSubCode';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = 'The player enters a map hosted by another game server.';
  static readonly CausedReaction = 'The client reconnects to that server and authenticates with the join codes.';
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xb1;
  static readonly SubCode = 0x00;

  /** The full wire size; shorter packets are dropped by the handler. */
  static readonly MinimumSize = 40;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }

  get IpAddress() {
    let val = '';
    for (let i = 4; i < 20 && i < this.buffer.byteLength; i++) {
      const ch = this.buffer.getUint8(i);
      if (ch === 0) break;
      val += String.fromCharCode(ch);
    }
    return val;
  }
  get Port() {
    return this.buffer.getUint16(20, true);
  }
  get ServerCode() {
    return this.buffer.getUint16(22, true);
  }
  get AuthCode1() {
    return this.buffer.getUint32(24, true);
  }
  get AuthCode2() {
    return this.buffer.getUint32(28, true);
  }
  get AuthCode3() {
    return this.buffer.getUint32(32, true);
  }
  get AuthCode4() {
    return this.buffer.getUint32(36, true);
  }
}
