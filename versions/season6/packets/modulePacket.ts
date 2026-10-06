/**
 * C1/C2 E8 - a module packet (`src/modules/_api/packetWire.ts`): one module's payload, named by the
 * module's id, sent by our OpenMU plugin (`openmu/plugins/`). OpenMU itself has no such packet, so this
 * is hand-written like the band relay.
 *
 * One class for every module: `SubCode` and `Length` are left undefined so the dispatcher's last
 * fallback matches any frame of the code at any length, and the module router
 * (`src/modules/_api/router.ts`) reads the id and hands the payload to that module.
 */
export class ModulePacket {
  buffer!: DataView;
  static readonly Name = 'ModulePacket';
  static readonly HeaderType = 'C1Header';
  static readonly HeaderCode = 0xc1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = 'A module\'s half on the server sends its module a payload.';
  static readonly CausedReaction = 'The module router hands the payload to the module the frame names.';
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xe8;

  constructor(buffer?: DataView) {
    if (buffer) this.buffer = buffer;
  }
}
