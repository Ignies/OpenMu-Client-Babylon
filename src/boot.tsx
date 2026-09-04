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

let lastTime = performance.now();
engine.runRenderLoop(() => {
  const now = performance.now();

  const deltaTime = Math.min((now - lastTime) / 1000, MAX_FRAME_DELTA);
  world.gameTime.TotalGameTime.TotalSeconds += deltaTime;

  const updateStarted = performance.now();
  updateSystems(deltaTime);
  recordFrame(performance.now() - updateStarted, now - lastTime);

  scene.render();

  lastTime = now;
});

const onResize = () => engine.resize();

window.addEventListener('resize', onResize);

onResize();

const PREGAME_WORLDS: ReadonlySet<ENUM_WORLD> = new Set([
  ENUM_WORLD.WD_73NEW_LOGIN_SCENE,
  ENUM_WORLD.WD_74NEW_CHARACTER_SCENE,
]);

EventBus.on('requestWarp', ({ map, pos }) => {
  const betweenMenus = PREGAME_WORLDS.has(map) && PREGAME_WORLDS.has(world.mapIndex);

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
