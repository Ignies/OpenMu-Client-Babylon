// Loads a world's streamed modules (readme.md, "Streaming"): first party in process, third party in its
// sandboxed frame after the player's consent; unloads them when the player leaves the world.
import type { ComponentType } from 'react';
import type { StreamedModuleEntry } from '../servers/serverManifest';
import { MODULE_API_VERSION, canServe } from './contract';
import { SANDBOX_LIMITS, serveModule } from './dispatcher';
import type { ModuleHost } from './host';
import type { PortLike } from './protocol';
import type { ReadyModule, StreamNotice } from './download';

/** A third-party module's frame, mounted and handed its port: `slot` draws the frame in a window. */
export type Frame = { port: PortLike; slot: ComponentType; remove(): void };

/** What a module file exports by default (`streamed.ts` `defineStreamedModule`). */
type StreamedDef = { api?: unknown; core?: unknown; install(api: unknown): unknown };

/** The streamer's side of the client (`streamPorts.ts` is the real one, the tests fake it). */
export type StreamerDeps = {
  host: ModuleHost;
  prepare(entries: readonly StreamedModuleEntry[], dropped: readonly string[], manifestUrl: string): Promise<{ ready: ReadyModule[]; notices: StreamNotice[] }>;
  firstParty(entry: StreamedModuleEntry): Promise<boolean>;
  /** The player's answer for this module and version on this world (asked once, then remembered). */
  consent(world: string, entry: StreamedModuleEntry): Promise<boolean>;
  /** Runs the file in the page and gives its default export. */
  importModule(bytes: Uint8Array): Promise<unknown>;
  mountFrame(bytes: Uint8Array, id: string): Promise<Frame>;
  /** Resolves once the hero is in the game world, where a module belongs. */
  inWorld(): Promise<void>;
  isBuiltIn(id: string): boolean;
  notify(notice: StreamNotice): void;
};

type Loaded = { entry: StreamedModuleEntry; firstParty: boolean; unload(): void };

const isDef = (v: unknown): v is StreamedDef =>
  typeof v === 'object' && v !== null && typeof (v as StreamedDef).install === 'function';

export function createStreamer(deps: StreamerDeps) {
  const loaded = new Map<string, Loaded>();
  let world: string | null = null;
  /** Bumped by every enter and leave: work started for an older one stops. */
  let generation = 0;

  const notice = (key: StreamNotice['key'], id: string) => deps.notify({ key, params: { id } });

  function unload(id: string): void {
    loaded.get(id)?.unload();
    loaded.delete(id);
  }

  async function inProcess({ entry, bytes }: ReadyModule, gen: number): Promise<Loaded | null> {
    const id = entry.id;
    let def: unknown;
    try {
      def = await deps.importModule(bytes);
    } catch {
      def = null;
    }
    if (!isDef(def)) return notice('moduleStream.failed', id), null;
    if (def.core) return notice('moduleStream.core', id), null;
    if (def.api !== undefined && !canServe(def.api as string)) {
      deps.notify({ key: 'moduleStream.api', params: { id, range: String(def.api), have: MODULE_API_VERSION } });
      return null;
    }
    if (gen !== generation) return null;
    try {
      await def.install(deps.host.api(id));
    } catch {
      deps.host.dispose(id);
      return notice('moduleStream.failed', id), null;
    }
    return { entry, firstParty: true, unload: () => deps.host.dispose(id) };
  }

  async function sandboxed({ entry, bytes }: ReadyModule, worldId: string, gen: number): Promise<Loaded | null> {
    const id = entry.id;
    if (!(await deps.consent(worldId, entry))) return notice('moduleStream.declined', id), null;
    if (gen !== generation) return null;
    let frame: Frame;
    try {
      frame = await deps.mountFrame(bytes, id);
    } catch {
      return notice('moduleStream.failed', id), null;
    }
    const api = deps.host.api(id);
    // The module's frame is its window: a window it registers draws the frame.
    const wrapped = { ...api, registerWindow: (w: Parameters<typeof api.registerWindow>[0]) => api.registerWindow({ ...w, draw: frame.slot }) };
    const stop = serveModule(frame.port, wrapped, { ...SANDBOX_LIMITS, now: () => performance.now() });
    return {
      entry,
      firstParty: false,
      unload: () => {
        stop();
        frame.remove();
        deps.host.dispose(id);
      },
    };
  }

  async function load(ready: ReadyModule, worldId: string, gen: number): Promise<Loaded | null> {
    const id = ready.entry.id;
    if (deps.isBuiltIn(id)) return notice('moduleStream.builtIn', id), null;
    return (await deps.firstParty(ready.entry)) ? inProcess(ready, gen) : sandboxed(ready, worldId, gen);
  }

  return {
    /**
     * The world's list (its `server.json`): downloads and checks it, then once the hero is in the
     * world loads what is new, keeps what is unchanged and unloads the rest.
     */
    async enter(worldId: string, manifestUrl: string, entries: readonly StreamedModuleEntry[], dropped: readonly string[]): Promise<void> {
      const gen = ++generation;
      if (worldId !== world) {
        for (const id of [...loaded.keys()]) unload(id);
        world = worldId;
      }
      const { ready, notices } = await deps.prepare(entries, dropped, manifestUrl);
      if (gen !== generation) return;
      notices.forEach(deps.notify);
      for (const [id, l] of [...loaded]) {
        if (!ready.some(r => r.entry.id === id && r.entry.sha256 === l.entry.sha256)) unload(id);
      }
      if (!ready.length) return;
      await deps.inWorld();
      for (const r of ready) {
        if (gen !== generation) return;
        if (loaded.has(r.entry.id)) continue;
        const l = await load(r, worldId, gen);
        if (!l) continue;
        if (gen !== generation) return l.unload();
        loaded.set(r.entry.id, l);
      }
    },

    /** The player left the world: every module goes (frames removed, windows and listeners gone). */
    leave(): void {
      generation++;
      world = null;
      for (const id of [...loaded.keys()]) unload(id);
    },

    loaded: () => [...loaded.values()].map(({ entry, firstParty }) => ({ id: entry.id, version: entry.version, firstParty })),
  };
}

export type Streamer = ReturnType<typeof createStreamer>;
