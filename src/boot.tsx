import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './style.less';
import './logic';
import { Store } from './store';
import { Social } from './social';
import { Economy } from './economy';
import { sound, installUiWindowChime } from './sound';
import { Engine } from './libs/babylon/exports';
import { createEngine } from './libs/babylon/utils';
import { TestScene } from './scenes/testScene';
import { loadMapIntoScene } from './libs/mu/loadMapIntoScene';
import { prefetchWorldTerrain } from './libs/mu/prefetchWorld';
import { createWorld } from './ecs/createWorld';
import { ENUM_WORLD } from './common';
import { EventBus } from './libs/eventBus';
import { installLoginMusic } from './libs/loginMusic';
import {
  preloadPregameSprites,
  preloadWorldSprites,
} from './libs/mu/preloadSprites';
import { installPerfOverlay, recordFrame } from './libs/perfOverlay';
import { refreshServerList } from './common/serverList';
import { loadVersionUi } from './version';

if (APP_STAGE === 'dev' || QA_ENABLED) {
  import('@babylonjs/core/Legacy/legacy');
}

installUiWindowChime();

const canvas = document.querySelector('canvas')!;

let useAntialiaing = false;

let engine: Engine;
try {
  const result = createEngine(canvas, useAntialiaing);
  engine = result.engine;
  engine.hideLoadingUI();
} catch (e) {
  console.error(e);
  throw e;
}

// Keyboard: every keydown guard (page scroll keys, Tab, Alt, IME, the
// window stack) lives in `ecs/systems/keyboardInputSystem.ts`.
const ignoredIds = ['scene-explorer-host', 'inspector-host'];

// The right button is the cast button (`Attack()` with MouseRButton), and
// the browser's context menu carries "Reload" — one right click that lands
// on a HUD element, a window, a name tag or the page margin instead of the
// canvas used to open it, and a slip from there reloaded the game. The
// canvas already swallowed its own `contextmenu`; this covers everything
// else on the page. Text fields keep theirs: an input's menu has no reload
// entry and is how some players paste into chat.
window.addEventListener('contextmenu', ev => {
  let p = ev.target as HTMLElement | null;
  while (p) {
    if (p.isContentEditable) return;
    const tag = p.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (p.classList && ignoredIds.includes(p.id)) return;
    p = p.parentElement;
  }
  ev.preventDefault();
});
window.addEventListener(
  'wheel',
  ev => {
    let p = ev.target as HTMLElement;
    while (p) {
      if (
        p.classList &&
        (p.classList.contains('scrollable') || ignoredIds.includes(p.id))
      )
        return;

      p = p.parentElement as any;
    }

    ev.preventDefault();
  },
  { passive: false }
);

let _hiddenAttr = '';
const onVisibilityChanged = () => {
  const hidden = !!document[_hiddenAttr as 'hidden'];

  EventBus.emit('pageVisibilityChanged', !hidden);
};

if (document.hidden !== undefined) {
  _hiddenAttr = 'hidden';
  document.addEventListener('visibilitychange', onVisibilityChanged, false);
}
//@ts-ignore
else if (document.mozHidden !== undefined) {
  _hiddenAttr = 'mozHidden';
  document.addEventListener('mozvisibilitychange', onVisibilityChanged, false);
}
//@ts-ignore
else if (document.msHidden !== undefined) {
  _hiddenAttr = 'msHidden';
  document.addEventListener('msvisibilitychange', onVisibilityChanged, false);
}
//@ts-ignore
else if (document.webkitHidden !== undefined) {
  _hiddenAttr = 'webkitHidden';
  document.addEventListener(
    'webkitvisibilitychange',
    onVisibilityChanged,
    false
  );
}

const scene = new TestScene(engine);

sound.init(scene);
// `MUSIC_LOGIN_THEME` over the server / login / character pages.
installLoginMusic();

const { world, updateSystems } = createWorld(scene);
Store.world = world;

// Render-budget overlay: Shift+Ctrl+Alt+P. Dormant until toggled.
installPerfOverlay(scene);

(window as any).__scene = scene;
(window as any).__world = world;
(window as any).__social = Social;
// Live instance for the CDP scenario scripts: a dynamic import('/src/economy.ts')
// gets a second module copy (vite serves the live graph as `?t=`-stamped URLs)
// whose state never changes.
(window as any).__eco = Economy;
(window as any).__store = Store;
// The sound facade, for the headless verification scripts (`sound.unlocked`,
// `sound.isPlaying(key)`, `sound.crackling`).
(window as any).__sound = sound;

/**
 * Longest step any system is handed. Coming back from an alt-tab (or from a
 * map load that blocked the main thread) otherwise feeds a multi-second dt
 * into movement, fades and timers at once: characters teleport along their
 * path, death fades finish instantly, particle bursts skip their whole life.
 * 100 ms is a hard frame-rate floor of 10 fps for simulation purposes.
 */
const MAX_FRAME_DELTA = 0.1;

/**
 * Babylon queues the next animation frame only after the render function
 * returns: an exception out of a frame ends the render loop for good, and
 * the game "hangs" in the worst possible way — the canvas freezes while the
 * socket keeps delivering packets and the sounds keep playing (that is what
 * a Summoner saw when a Drain Life tether expired). A frame that throws is
 * logged and skipped; the next one runs. Logging is throttled so a fault
 * that repeats every frame does not bury the console.
 */
const FRAME_ERROR_LOG_INTERVAL_MS = 5000;
let lastFrameErrorAt = -Infinity;
let frameErrorsSinceLog = 0;

let lastTime = performance.now();
engine.runRenderLoop(() => {
  const now = performance.now();

  const frameMs = now - lastTime;
  const deltaTime = Math.min(frameMs / 1000, MAX_FRAME_DELTA);
  // Advanced before the frame runs, so a frame that throws is not replayed
  // as a double-length one by the next.
  lastTime = now;

  try {
    world.gameTime.TotalGameTime.TotalSeconds += deltaTime;

    const updateStarted = performance.now();
    updateSystems(deltaTime);
    recordFrame(performance.now() - updateStarted, frameMs);

    scene.render();
  } catch (err) {
    frameErrorsSinceLog++;
    if (now - lastFrameErrorAt >= FRAME_ERROR_LOG_INTERVAL_MS) {
      console.error(
        `frame threw (${frameErrorsSinceLog} since last report), continuing:`,
        err
      );
      lastFrameErrorAt = now;
      frameErrorsSinceLog = 0;
    }
  }
});

const onResize = () => engine.resize();

window.addEventListener('resize', onResize);

onResize();

/**
 * The version's two menu worlds, so stepping from the login backdrop to the
 * character one does not flash the loading screen. Empty for a version whose
 * pre-game backdrop is a standalone set piece instead of a world.
 */
let pregameWorlds: ReadonlySet<ENUM_WORLD> = new Set();

void loadVersionUi().then(({ pregame }) => {
  if (pregame.backdrop.kind !== 'world') return;

  pregameWorlds = new Set([
    pregame.backdrop.login,
    pregame.backdrop.characters,
  ]);
});

EventBus.on('requestWarp', ({ map, pos }) => {
  const betweenMenus =
    pregameWorlds.has(map) && pregameWorlds.has(world.mapIndex);

  if (!betweenMenus) {
    Store.setSceneLoading(true);
  }

  // The terrain files go out together, before the loader's first await; the
  // loader picks up the same promises (prefetchWorld.ts).
  if (map !== world.mapIndex) prefetchWorldTerrain(map);

  loadMapIntoScene(world, map, pos);
});

preloadPregameSprites()
  .finally(() => Store.setSpritesLoading(false))
  .then(() => preloadWorldSprites());

// The published server list (`common/serverList.ts`), once per launch. Nothing
// waits on it: it fills the picker when it lands, and the saved servers are
// what the client uses until then — or instead, if it never lands.
refreshServerList();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (Store.isOffline) {
  Store.playOffline();
}
