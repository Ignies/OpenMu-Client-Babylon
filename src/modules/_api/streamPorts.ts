// The streamer's side of the page (readme.md, "Streaming"): Cache Storage, the frames, the consent box,
// the notices, and when the hero enters and leaves a world. Needs a browser; the logic is `streamer.ts`.
import { createElement, useLayoutEffect, useRef, type ComponentType } from 'react';
import { reaction, when } from 'mobx';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { AppState, UIState } from '@/controllers/interface/uiState';
import { MsgBox, MsgWinCode } from '@/controllers/interface/msgWin';
import { addNotification } from '../chat/notify';
import { onModulesListed, type StreamedModuleEntry } from '../servers/serverManifest';
import { moduleHost } from './ports';
import { cacheStore, memoryStore, prepareModules } from './download';
import { isFirstParty } from './signature';
import { askConsent } from './consent';
import { handOverPort, sandboxFrame, sandboxPage } from './sandbox';
import { createStreamer, type Frame } from './streamer';

/** How long a frame may take to load its page before the module counts as failed. */
const FRAME_LOAD_MS = 10_000;

/** Cache Storage where the page has it (https), else memory until the page reloads. */
const store =
  typeof caches === 'undefined' ? memoryStore() : cacheStore(() => caches.open('mu-modules'), location.origin);

/** Runs a first-party module's file in the page and gives its default export. */
async function importModule(bytes: Uint8Array): Promise<unknown> {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
  try {
    return ((await import(/* @vite-ignore */ url)) as { default?: unknown }).default;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The layer the frames live in, over the game: a frame shows only where its window's slot is. */
let layer: HTMLDivElement | null = null;
function frameLayer(): HTMLDivElement {
  if (!layer) {
    layer = document.createElement('div');
    Object.assign(layer.style, { position: 'fixed', left: '0', top: '0', width: '0', height: '0', zIndex: '1000' });
    document.body.appendChild(layer);
  }
  return layer;
}

/** A window's content area: while it is drawn, the module's frame covers it; moving the frame would reload it. */
function frameSlot(frame: HTMLIFrameElement): ComponentType {
  return observer(function ModuleFrameSlot() {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      const slot = ref.current;
      if (!slot) return;
      const place = () => {
        const r = slot.getBoundingClientRect();
        Object.assign(frame.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, visibility: 'visible' });
      };
      place();
      const watch = new ResizeObserver(place);
      watch.observe(slot);
      window.addEventListener('resize', place);
      return () => {
        watch.disconnect();
        window.removeEventListener('resize', place);
        frame.style.visibility = 'hidden';
      };
    }, []);
    return createElement('div', { ref, style: { position: 'absolute', left: 12, right: 12, top: 40, bottom: 12 } });
  });
}

/** Mounts a third-party module's frame (`allow-scripts` only) and hands it its port once its page has loaded. */
async function mountFrame(bytes: Uint8Array, id: string): Promise<Frame> {
  const frame = document.createElement('iframe');
  for (const [name, value] of Object.entries(sandboxFrame({ srcdoc: sandboxPage(bytes) }))) frame.setAttribute(name, value);
  frame.title = id;
  Object.assign(frame.style, { position: 'fixed', border: '0', width: '0', height: '0', visibility: 'hidden' });
  const loaded = new Promise<void>((resolve, reject) => {
    frame.onload = () => resolve();
    setTimeout(() => reject(new Error(`module ${id}: the frame did not load`)), FRAME_LOAD_MS);
  });
  frameLayer().appendChild(frame);
  try {
    await loaded;
  } catch (e) {
    frame.remove();
    throw e;
  }
  const port = handOverPort(frame.contentWindow as Window);
  return {
    port,
    slot: frameSlot(frame),
    remove: () => {
      port.close();
      frame.remove();
    },
  };
}

/**
 * The consent box, once no other box is up: true for Yes, false for No, undefined when another box
 * took its place (asked again next time).
 */
async function promptConsent(entry: StreamedModuleEntry): Promise<boolean | undefined> {
  await when(() => MsgBox.msgWin === null);
  return new Promise(resolve => {
    let yes = false;
    MsgBox.popUpMsgWin(MsgWinCode.ConfirmModule, { id: entry.id, version: entry.version }, () => (yes = true));
    const box = MsgBox.msgWin;
    // The box closes before its Yes handler runs (`msg_window`): answer once both are done.
    when(
      () => MsgBox.msgWin !== box,
      () => queueMicrotask(() => resolve(yes ? true : MsgBox.msgWin === null ? false : undefined))
    );
  });
}

/**
 * Streams each world's modules (its `server.json` list) from the moment it is entered, and unloads them
 * when the player goes back to the server choice. `src/app/logic.ts` calls it. Returns the uninstall.
 */
export function installModuleStreaming(isBuiltIn: (id: string) => boolean): () => void {
  const streamer = createStreamer({
    host: moduleHost,
    prepare: (entries, dropped, url) => prepareModules(entries, dropped, url, { store, fetch: (u, init) => fetch(u, init) }),
    firstParty: entry => isFirstParty(entry),
    consent: (world, entry) => askConsent(world, entry, () => promptConsent(entry)),
    importModule,
    mountFrame,
    inWorld: () => when(() => AppState.uiState === UIState.World),
    isBuiltIn,
    notify: ({ key, params }) => addNotification(t(key, params), 'error'),
  });
  const offList = onModulesListed((world, url, modules, dropped) => void streamer.enter(world, url, modules, dropped));
  const offLeave = reaction(
    () => AppState.uiState,
    state => {
      if (state === UIState.Servers || state === UIState.Preloader) streamer.leave();
    }
  );
  return () => {
    offList();
    offLeave();
    streamer.leave();
  };
}
