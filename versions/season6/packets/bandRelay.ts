/**
 * C1 FA - a band frame relayed by the ws proxy (`proxy/band/hub.ts`): a
 * performer in scope started, stopped, sent a batch of notes, or the band
 * around them changed; or the proxy's own hello / refusal to this client.
 * OpenMU has no such packet - the proxy originates these the way it does
 * the weather - so this is hand-written like the map-server move.
 *
 * One class for every sub: `SubCode` and `Length` are left undefined so the
 * dispatcher's last fallback matches any sub at any length, and
 * `src/common/bandProtocol.ts` reads the body. Per-sub classes would be
 * nine names, nine listeners and nine "unhandled packet" warnings.
 */
export class BandRelayPacket {
  buffer!: DataView;
  static readonly Name = 'BandRelay';
  static readonly HeaderType = 'C1Header';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = 'The proxy relays a live-band frame from a performer in scope, or answers this client.';
  static readonly CausedReaction = 'The band module plays, stops or re-routes the performer\'s instrument.';
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xfa;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }

  get Sub() {
    return this.buffer.getUint8(3);
  }

  /** The performer's object id (masked), or the receiver's own for a notice, or 0 for hello. */
  get PerformerId() {
    return this.buffer.getUint16(4, false);
  }

  /** The whole frame, header included, for `decodeRelayFrame`. */
  get bytes(): Uint8Array {
    return new Uint8Array(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
  }
}
