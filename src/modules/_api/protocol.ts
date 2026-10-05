// The message binding's wire (readme.md): plain JSON, versioned by `v`. Calls `{ v, id, call, args }`,
// answers `{ id, result }` or `{ id, error }`, events `{ event, data }`. Imports nothing of the game.
import type { ModuleApi } from './contract';

export const PROTOCOL_VERSION = 1;

/** The largest call the host reads: the length of its JSON. */
export const MAX_MESSAGE_SIZE = 64 * 1024;

type Api = Omit<ModuleApi, 'onMapChange'>;

/** Each call's arguments: v1's calls, with `onMapChange` as a subscribe and an `offMapChange`. */
export type CallArgs = { [K in keyof Api]: Parameters<Api[K]> } & { onMapChange: []; offMapChange: [] };
export type CallName = keyof CallArgs;
/** What a call answers with. */
export type CallResult<K extends CallName> = K extends keyof Api ? ReturnType<Api[K]> : void;

export type CallMessage = { [K in CallName]: { v: number; id: number; call: K; args: CallArgs[K] } }[CallName];
export type Refusal = { id: number | null; error: string };
export type AnswerMessage = { id: number; result?: unknown } | Refusal;
export type EventMessage = { event: 'mapChange'; data: { map: number } };

/** What carries the messages: a `MessagePort` (the client's end, or the module's). */
export type PortLike = { postMessage(message: unknown): void; onmessage: ((event: MessageEvent) => void) | null };

type Json = Record<string, unknown>;
const isObject = (o: unknown): o is Json => typeof o === 'object' && o !== null && !Array.isArray(o);
const hasOnly = (o: Json, keys: string[]) => Object.keys(o).every(k => keys.includes(k));
const isString = (s: unknown): s is string => typeof s === 'string';
const isId = (id: unknown): id is number => Number.isSafeInteger(id) && (id as number) >= 0;

/** What each call's arguments must be. */
const ARGS: Record<CallName, (args: unknown[]) => boolean> = {
  registerText: ([code, strings, ...rest]) =>
    !rest.length && isString(code) && isObject(strings) && Object.values(strings).every(isString),
  registerWindow: ([w, ...rest]) =>
    !rest.length && isObject(w) && hasOnly(w, ['id', 'title', 'hotKey']) &&
    isString(w.id) && isString(w.title) && (w.hotKey === undefined || isString(w.hotKey)),
  playSound: ([id, ...rest]) => !rest.length && isString(id),
  playEffect: ([id, at, ...rest]) =>
    !rest.length && isString(id) && isObject(at) && hasOnly(at, ['x', 'y']) && Number.isFinite(at.x) && Number.isFinite(at.y),
  hero: args => !args.length,
  onMapChange: args => !args.length,
  offMapChange: args => !args.length,
};

/**
 * Reads one incoming message as a v1 call, or says why not. It works on a JSON copy, so the game only
 * ever sees plain data, and refuses an unknown call, wrong arguments and a message over the size limit.
 */
export function readCall(data: unknown): CallMessage | Refusal {
  let text: string | undefined;
  try {
    text = JSON.stringify(data);
  } catch {
    // a cycle or a BigInt: not JSON
  }
  if (text === undefined) return { id: null, error: 'not JSON' };
  const idOf = (o: unknown) => (isObject(o) && isId(o.id) ? o.id : null);
  if (text.length > MAX_MESSAGE_SIZE) return { id: idOf(data), error: 'message too large' };
  const m: unknown = JSON.parse(text);
  const id = idOf(m);
  if (!isObject(m) || id === null || !hasOnly(m, ['v', 'id', 'call', 'args']) || !isString(m.call) || !Array.isArray(m.args)) {
    return { id, error: 'not a call' };
  }
  if (m.v !== PROTOCOL_VERSION) return { id, error: `protocol ${m.v} not served` };
  if (!Object.hasOwn(ARGS, m.call)) return { id, error: `no call ${m.call}` };
  if (!ARGS[m.call as CallName](m.args)) return { id, error: `bad arguments to ${m.call}` };
  return m as CallMessage;
}
