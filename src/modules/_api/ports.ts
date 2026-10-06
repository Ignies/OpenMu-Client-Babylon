// The game's side of the module API (readme.md): the controllers and module doors a module's calls reach.
import { createElement } from 'react';
import { observer } from 'mobx-react-lite';
import { registerText, t, type TextKey } from '@/i18n';
import { registerWindows, unregisterWindow } from '@/controllers/interface/windows';
import { MuWindows } from '@/controllers/interface/windowManager';
import { ModuleWindowFrame } from '@/controllers/interface/components/module_window';
import { SOUND_FILES, isMusicKey, type Sounds } from '@/controllers/sound/recipes';
import { UI_BUS, playSfx } from '@/controllers/sound/sfx';
import { effects } from '@/controllers/fx';
import type { BurstKind } from '@/controllers/fx/bursts';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { Ecs } from '@/ecs/current';
import { EventBus } from '@/core/eventBus';
import { Hero } from '../hero';
import { Session } from '../session';
import { onMapChanged } from '../warp';
import { createModuleHost, type Game } from './host';
import { createModuleRouter } from './router';

/** The effects a module may play by name: the fx controller's bursts (`controllers/fx/bursts.ts`). */
const EFFECTS: ReadonlySet<string> = new Set<BurstKind>(['levelUp', 'shieldPotion', 'shieldLost', 'swirl']);

/** Module windows stack over the built-in ones. */
const WINDOW_ORDER = 1000;

export const game: Game = {
  registerText,
  addWindow(key, module, { title, hotKey, draw }) {
    const component = observer(() =>
      createElement(ModuleWindowFrame, { id: key, title: t(title as TextKey), hotKey }, draw && createElement(draw))
    );
    registerWindows([{ id: key, slot: 'hud', order: WINDOW_ORDER, component, module }]);
    return () => {
      unregisterWindow(key);
      MuWindows.setOpen(key, false);
    };
  },
  playSound(id) {
    if (!Object.hasOwn(SOUND_FILES, id) || isMusicKey(id as Sounds)) return false;
    playSfx(id as Sounds, null, { bus: UI_BUS });
    return true;
  },
  playEffect(id, at) {
    if (!EFFECTS.has(id)) return false;
    const world = Ecs.world;
    if (world) {
      const where = new Vector3(at.x, world.getTerrainHeight(at.x, at.y), at.y);
      effects.spawn('bursts', world.scene, where, { kind: id as BurstKind });
    }
    return true;
  },
  hero() {
    const world = Ecs.world;
    const pos = world?.playerEntity?.transform?.pos;
    return Object.freeze({
      name: Hero.name,
      class: Hero.charClass,
      level: Hero.level,
      map: world ? world.mapIndex : -1,
      x: pos ? Math.floor(pos.x) : 0,
      y: pos ? Math.floor(pos.z) : 0,
    });
  },
  onMapChange: onMapChanged,
  sendPacket: frame => Session.sendToGS(new DataView(frame.buffer, frame.byteOffset, frame.byteLength)),
};

/** The client's one host: `src/app/logic.ts` hands `moduleHost.api` to `installModules`. */
export const moduleHost = createModuleHost(game);

/** The client's one router, over `moduleHost`: `moduleRouter.dropped` counts the frames that went nowhere. */
export const moduleRouter = createModuleRouter(moduleHost);

/** Installs the one listener for the module packet (E8); `src/app/logic.ts` calls it with the module host. Returns the uninstall. */
export function installModuleRouter(): () => void {
  const route = (packet: DataView) => moduleRouter.route(new Uint8Array(packet.buffer, packet.byteOffset, packet.byteLength));
  EventBus.on('ModulePacket', route);
  return () => EventBus.off('ModulePacket', route);
}
