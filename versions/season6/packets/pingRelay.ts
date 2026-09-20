/**
 * C1 FB - a map ping relayed by the ws proxy (`proxy/ping/hub.ts`): a player
 * in scope pointed at a spot on the ground, or the proxy's own hello to this
 * client. OpenMU has no such packet - the proxy originates these the way it
 * does the weather and the band - so this is hand-written like the map-server
 * move.
 *
 * One class for both subs: `SubCode` and `Length` are left undefined so the
 * dispatcher's last fallback matches any sub at any length, and
 * `src/common/pingProtocol.ts` reads the body.
 */
export class PingRelayPacket {
  buffer!: DataView;
  static readonly Name = 'PingRelay';
  static readonly HeaderType = 'C1Header';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = 'The proxy relays a map ping from a player in scope, or greets this client.';
  static readonly CausedReaction = 'The ping module draws the pointer and its trail for two seconds.';
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xfb;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }

  get Sub() {
    return this.buffer.getUint8(3);
  }

  /** The pinging player's object id, or 0 for hello. */
  get SenderId() {
    return this.buffer.getUint16(4, false);
  }

  /** The whole frame, header included, for `decodeRelayFrame`. */
  get bytes(): Uint8Array {
    return new Uint8Array(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
  }
}
