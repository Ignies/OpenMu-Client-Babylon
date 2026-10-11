// The module packet router (readme.md): every frame of the extension code goes to the module whose id it
// names. A frame nobody listens to, or one that cannot be read, is dropped and counted, never thrown.
import type { ModuleHost } from './host';
import { decodeModuleFrame } from './packetWire';

export function createModuleRouter(host: Pick<ModuleHost, 'deliver'>) {
  /** The frames dropped so far: for a module that is not loaded or not listening, and unreadable ones. */
  const dropped = { noListener: 0, malformed: 0 };
  return {
    dropped,
    /** Routes one whole frame, header included. */
    route(frame: Uint8Array): void {
      const read = decodeModuleFrame(frame);
      if ('error' in read) dropped.malformed++;
      else if (!host.deliver(read.id, read.payload)) dropped.noListener++;
    },
  };
}
