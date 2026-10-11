import { afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
import { runInAction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { ENUM_WORLD } from '@/core/types';
import { Ecs } from '@/ecs/current';
import type { World } from '@/ecs/world';
import { t, type TextKey } from '@/i18n';
import { windowsIn } from '@/controllers/interface/windows';
import { MuWindows } from '@/controllers/interface/windowManager';
import { Hero } from '../hero';
import { Session } from '../session';
import { encodeModuleFrame } from './packetWire';
import { game, installModuleRouter, moduleHost, moduleRouter } from './ports';

afterEach(() => runInAction(() => (Ecs.world = null)));

describe('the game side of the module API', () => {
  it('registers a module\'s text where t() reads it', () => {
    game.registerText('en', { 'ports_test.title': 'Ports' });
    expect(t('ports_test.title' as TextKey)).toBe('Ports');
  });

  it('adds a window of the module to the HUD, and takes it away closed', () => {
    const remove = game.addWindow('ports_test:main', 'ports_test', { id: 'main', title: 'ports_test.title' });
    expect(windowsIn('hud').find(w => w.id === 'ports_test:main')).toMatchObject({ module: 'ports_test', slot: 'hud' });
    MuWindows.setOpen('ports_test:main', true);
    remove();
    expect(windowsIn('hud').some(w => w.id === 'ports_test:main')).toBe(false);
    expect(MuWindows.isOpen('ports_test:main')).toBe(false);
  });

  it('knows only the catalogue\'s effect sounds and the fx bursts', () => {
    expect(game.playSound('Sound/nothing')).toBe(false);
    expect(game.playSound('toString')).toBe(false);
    expect(game.playSound('Music/Dungeon')).toBe(false);
    expect(game.playEffect('nothing', { x: 1, y: 1 })).toBe(false);
    expect(game.playEffect('levelUp', { x: 1, y: 1 })).toBe(true);
  });

  it('snapshots the hero: name, class, level, map and tile', () => {
    runInAction(() => {
      Hero.name = 'Snap';
      Hero.level = 77;
      Ecs.world = { mapIndex: ENUM_WORLD.WD_2DEVIAS, playerEntity: { transform: { pos: { x: 120.7, y: 0, z: 33.2 } } } } as unknown as World;
    });
    const hero = game.hero();
    expect(hero).toEqual({ name: 'Snap', class: Hero.charClass, level: 77, map: ENUM_WORLD.WD_2DEVIAS, x: 120, y: 33 });
    expect(Object.isFrozen(hero)).toBe(true);
    runInAction(() => (Ecs.world = null));
    expect(game.hero()).toMatchObject({ map: -1, x: 0, y: 0 });
  });

  it('sends a module\'s frame to the game server through the session, like every other packet', () => {
    const sent: number[][] = [];
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(view => void sent.push([...new Uint8Array(view.buffer, view.byteOffset, view.byteLength)]));
    const frame = encodeModuleFrame('ports_test', Uint8Array.from([1, 2]));
    game.sendPacket(frame);
    send.mockRestore();
    expect(sent).toEqual([[...frame]]);
  });

  it('routes a module packet off the socket to the module that listens, and counts one nobody hears', () => {
    const stop = installModuleRouter();
    const heard: number[][] = [];
    moduleHost.api('ports_test').onPacket(p => heard.push([...p]));
    const emit = (frame: Uint8Array) => EventBus.emit('ModulePacket', new DataView(frame.buffer, frame.byteOffset, frame.byteLength));
    const unheard = moduleRouter.dropped.noListener;
    emit(encodeModuleFrame('ports_test', Uint8Array.from([4, 5])));
    emit(encodeModuleFrame('ports_nobody', Uint8Array.from([6])));
    stop();
    emit(encodeModuleFrame('ports_test', Uint8Array.from([7])));
    moduleHost.dispose('ports_test');
    expect(heard).toEqual([[4, 5]]);
    expect(moduleRouter.dropped.noListener).toBe(unheard + 1);
  });

  it('follows map changes through the warp module', () => {
    const seen: number[] = [];
    const off = moduleHost.api('ports_test').onMapChange(map => seen.push(map));
    EventBus.emit('warpCompleted', { map: ENUM_WORLD.WD_3NORIA });
    moduleHost.dispose('ports_test');
    EventBus.emit('warpCompleted', { map: ENUM_WORLD.WD_2DEVIAS });
    off();
    expect(seen).toEqual([ENUM_WORLD.WD_3NORIA]);
  });
});
