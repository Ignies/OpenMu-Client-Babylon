// The client's end of the message binding (readme.md): every message a sandboxed module sends is read
// by `readCall`; a refusal is answered and goes no further, a valid call is made on the module's API.
import type { ModuleApi } from './contract';
import { fromBase64, readCall, toBase64, type AnswerMessage, type CallMessage, type EventMessage, type PortLike } from './protocol';

type Rate = { perSecond: number; burst: number };

/** What a sandboxed module may do (readme.md, "Limits"); `now` is the clock the rates run on, in ms. */
export type Limits = {
  /** Windows it may have: its frame is its one surface. */
  windows: number;
  /** Text lines it may register, counting each language and key once. */
  textEntries: number;
  /** The longest line it may register, in characters. */
  textLine: number;
  calls: Rate;
  packets: Rate;
  now(): number;
};

/** The limits third-party modules run under: numbers a normal module never reaches. */
export const SANDBOX_LIMITS: Omit<Limits, 'now'> = Object.freeze({
  windows: 1,
  textEntries: 4000,
  textLine: 1000,
  calls: { perSecond: 100, burst: 200 },
  packets: { perSecond: 30, burst: 60 },
});

/** A token bucket: `burst` at once, refilled at `perSecond`. Takes one token or answers false. */
function bucket({ perSecond, burst }: Rate, now: () => number): () => boolean {
  let tokens = burst;
  let at = now();
  return () => {
    const t = now();
    tokens = Math.min(burst, tokens + ((t - at) * perSecond) / 1000);
    at = t;
    if (tokens < 1) return false;
    tokens--;
    return true;
  };
}

const idOf = (data: unknown) =>
  typeof data === 'object' && data !== null && Number.isSafeInteger((data as { id?: unknown }).id) ? (data as { id: number }).id : null;

/**
 * Serves one module's in-process API (`moduleHost.api(id)`) over `port`, under `limits` when given
 * (a third-party module: `SANDBOX_LIMITS`). Returns the stop.
 */
export function serveModule(port: PortLike, api: ModuleApi<unknown>, limits?: Limits): () => void {
  let offMap: (() => void) | null = null;
  let offPacket: (() => void) | null = null;
  const send = (message: AnswerMessage | EventMessage) => port.postMessage(message);
  const call = limits ? bucket(limits.calls, limits.now) : () => true;
  const packet = limits ? bucket(limits.packets, limits.now) : () => true;
  const windows = new Set<string>();
  const text = new Set<string>();

  const need = (ok: boolean, why: string) => {
    if (!ok) throw new Error(why);
  };

  function run(m: CallMessage): unknown {
    switch (m.call) {
      case 'registerText': {
        const [code, strings] = m.args;
        if (limits) {
          need(Object.values(strings).every(line => line.length <= limits.textLine), `text limit: ${limits.textLine} characters a line`);
          const fresh = Object.keys(strings).filter(key => !text.has(`${code}\t${key}`));
          need(text.size + fresh.length <= limits.textEntries, `text limit: ${limits.textEntries} entries`);
          api.registerText(code, strings);
          for (const key of fresh) text.add(`${code}\t${key}`);
          return undefined;
        }
        return api.registerText(code, strings);
      }
      case 'registerWindow':
        if (limits) need(windows.has(m.args[0].id) || windows.size < limits.windows, `window limit: ${limits.windows}`);
        // No `draw`: in the sandbox the module's own frame is the window.
        api.registerWindow(m.args[0]);
        windows.add(m.args[0].id);
        return undefined;
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
        need(packet(), 'packet rate limit');
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
    // Over the rate, a call is refused before it is read: a flood costs no more than its answers.
    if (!call()) return send({ id: idOf(data), error: 'rate limit' });
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
