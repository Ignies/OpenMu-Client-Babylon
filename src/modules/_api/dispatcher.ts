// The client's end of the message binding (readme.md): every message a sandboxed module sends is read
// by `readCall`; a refusal is answered and goes no further, a valid call is made on the module's API.
import type { ModuleApi } from './contract';
import { fromBase64, readCall, toBase64, type AnswerMessage, type CallMessage, type EventMessage, type PortLike } from './protocol';

/** Serves one module's in-process API (`moduleHost.api(id)`) over `port`. Returns the stop. */
export function serveModule(port: PortLike, api: ModuleApi<unknown>): () => void {
  let offMap: (() => void) | null = null;
  let offPacket: (() => void) | null = null;
  const send = (message: AnswerMessage | EventMessage) => port.postMessage(message);

  function run(m: CallMessage): unknown {
    switch (m.call) {
      case 'registerText':
        return api.registerText(...m.args);
      case 'registerWindow':
        // No `draw`: in the sandbox the module's own frame is the window.
        return api.registerWindow(m.args[0]);
      case 'playSound':
        return api.playSound(...m.args);
      case 'playEffect':
        return api.playEffect(...m.args);
      case 'hero':
        return api.hero();
      case 'onMapChange':
        offMap ??= api.onMapChange(map => send({ event: 'mapChange', data: { map } }));
        return undefined;
      case 'offMapChange':
        offMap?.();
        offMap = null;
        return undefined;
      case 'sendPacket':
        return api.sendPacket(fromBase64(m.args[0]));
      case 'onPacket':
        offPacket ??= api.onPacket(payload => send({ event: 'packet', data: { payload: toBase64(payload) } }));
        return undefined;
      case 'offPacket':
        offPacket?.();
        offPacket = null;
        return undefined;
    }
  }

  port.onmessage = ({ data }) => {
    const m = readCall(data);
    if ('error' in m) return send(m);
    try {
      send({ id: m.id, result: run(m) });
    } catch (e) {
      send({ id: m.id, error: e instanceof Error ? e.message : 'refused' });
    }
  };

  return () => {
    port.onmessage = null;
    offMap?.();
    offPacket?.();
    offMap = offPacket = null;
  };
}
