// Test seam: a game that records what reaches it, for the host and binding tests (never loaded by the app).
import type { HeroSnapshot } from './contract';
import type { Game } from './host';

export const TEST_HERO: HeroSnapshot = Object.freeze({ name: 'Tester', class: 0, level: 42, map: 3, x: 120, y: 33 });
export const TEST_SOUNDS = ['Sound/iButtonClick'];
export const TEST_EFFECTS = ['levelUp'];

export function testGame() {
  const calls: unknown[][] = [];
  const maps = new Set<(map: number) => void>();
  const game: Game = {
    registerText: (code, strings) => void calls.push(['registerText', code, strings]),
    addWindow(key, module, window) {
      calls.push(['addWindow', key, module, { title: window.title, hotKey: window.hotKey, draws: !!window.draw }]);
      return () => void calls.push(['removeWindow', key]);
    },
    playSound: id => TEST_SOUNDS.includes(id) && calls.push(['playSound', id]) > 0,
    playEffect: (id, at) => TEST_EFFECTS.includes(id) && calls.push(['playEffect', id, { x: at.x, y: at.y }]) > 0,
    hero: () => TEST_HERO,
    onMapChange(fn) {
      maps.add(fn);
      return () => void maps.delete(fn);
    },
  };
  /** The hero stands on `map`. */
  const changeMap = (map: number) => maps.forEach(fn => fn(map));
  return { game, calls, changeMap, mapListeners: () => maps.size };
}
