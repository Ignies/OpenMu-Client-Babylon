// The module packet (readme.md): every module's packets travel inside one extension code, so OpenMU's
// own protocol never changes. `C1 len E8 idLen id payload`, or C2 (two length bytes) when it does not
// fit 255 bytes. Imports nothing of the game.
import { MODULE_ID } from './contract';

/** The extension packet's code, the same both ways (docs/module_streaming.md). */
export const MODULE_PACKET_CODE = 0xe8;

/** The longest frame: what a C2 header's length can say. */
export const MAX_FRAME = 0xffff;

/** The most payload one frame of module `id` carries: a C2 header, the code, the id's length byte and the id take the rest. */
export const maxPayload = (id: string) => MAX_FRAME - 5 - id.length;

export type ModuleFrame = { id: string; payload: Uint8Array };

/** The whole frame for one of module `id`'s packets. Throws on an id that is not a module id or a frame over `MAX_FRAME`. */
export function encodeModuleFrame(id: string, payload: Uint8Array): Uint8Array {
  if (!MODULE_ID.test(id)) throw new Error(`bad module id ${id}`);
  const head = 4 + id.length + payload.length <= 0xff ? 2 : 3;
  const size = head + 2 + id.length + payload.length;
  if (size > MAX_FRAME) throw new Error(`a frame of ${size} bytes is over ${MAX_FRAME}`);
  const frame = new Uint8Array(size);
  frame.set(head === 2 ? [0xc1, size] : [0xc2, size >> 8, size & 0xff]);
  frame.set([MODULE_PACKET_CODE, id.length], head);
  for (let i = 0; i < id.length; i++) frame[head + 2 + i] = id.charCodeAt(i);
  frame.set(payload, head + 2 + id.length);
  return frame;
}

/** Reads a whole frame, header included, or says why it is not one. Never throws; the payload is a copy. */
export function decodeModuleFrame(frame: Uint8Array): ModuleFrame | { error: string } {
  const head = frame[0] === 0xc1 ? 2 : frame[0] === 0xc2 ? 3 : 0;
  if (!head || (frame.length > head && frame[head] !== MODULE_PACKET_CODE)) return { error: 'not a module packet' };
  const size = head === 2 ? frame[1] : (frame[1] << 8) | frame[2];
  if (frame.length < head + 2 || size > frame.length) return { error: 'cut short' };
  const start = head + 2 + frame[head + 1];
  if (size < frame.length || start > size) return { error: 'lengths disagree' };
  const id = String.fromCharCode(...frame.subarray(head + 2, start));
  if (!MODULE_ID.test(id)) return { error: 'bad module id' };
  return { id, payload: frame.slice(start, size) };
}
