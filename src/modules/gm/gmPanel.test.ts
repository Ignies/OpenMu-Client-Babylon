import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Macro, MacroVars } from './admin/gmLibrary';

// What went out, in order, and the effects the hero carries (18 = Transparency, `/hide`).
const sent: string[] = [];
const buffs = new Set<number>();

vi.mock('../social/social', () => ({
  Social: {
    sendChat: (line: string) => {
      sent.push(line);
      return true;
    },
  },
}));
vi.mock('../skills', () => ({ skills: { hasBuff: (id: number) => buffs.has(id) } }));
vi.mock('../session', () => ({ Session: { isOffline: false } }));
vi.mock('../hero', () => ({ Hero: { isGameMaster: true } }));

const { GmPanel } = await import('./gmPanel');

const home = { map: 0, x: 130, y: 120 };
const tile = { map: 0, x: 140, y: 125 };
const vars: MacroVars = { ...tile, me: 'Gm', target: '' };
const macro = (...lines: [string, number][]): Macro => ({
  id: 'm',
  name: 'm',
  steps: lines.map(([line, delayMs]) => ({ line, delayMs })),
});

beforeEach(() => {
  vi.useFakeTimers();
  GmPanel.reset();
  sent.length = 0;
  buffs.clear();
});

afterEach(() => {
  GmPanel.reset();
  vi.useRealTimers();
});

describe('a macro run at a tile', () => {
  it('stays put when no step needs the game master there', () => {
    GmPanel.runMacroAt(macro(['/fireworks {x} {y}', 0], ['/goldnotice hi', 0]), vars, 'Gm', home);
    vi.runAllTimers();
    expect(sent).toEqual(['/fireworks 140 125', '/goldnotice hi']);
  });

  it('hides, goes, runs the steps with their delays, comes back and unhides', () => {
    GmPanel.runMacroAt(macro(['/createmonster 3 1', 1000], ['/goldnotice hi', 0]), vars, 'Gm', home);
    vi.advanceTimersByTime(1);
    expect(sent).toEqual(['/hide', '/move Gm 0 140 125', '/createmonster 3 1']);
    vi.advanceTimersByTime(998);
    expect(sent).toHaveLength(3);
    vi.runAllTimers();
    expect(sent).toEqual([
      '/hide',
      '/move Gm 0 140 125',
      '/createmonster 3 1',
      '/goldnotice hi',
      '/move Gm 0 130 120',
      '/unhide',
    ]);
  });

  it('counts a step with coordinates on the own map as needing the trip on another map', () => {
    GmPanel.runMacroAt(macro(['/fireworks {x} {y}', 0]), { ...vars, map: 3 }, 'Gm', home);
    vi.runAllTimers();
    expect(sent).toEqual(['/hide', '/move Gm 3 140 125', '/fireworks 140 125', '/move Gm 0 130 120', '/unhide']);
  });

  it('leaves an invisible game master invisible', () => {
    buffs.add(18);
    GmPanel.runMacroAt(macro(['/item 0 0', 0]), vars, 'Gm', home);
    vi.runAllTimers();
    expect(sent).toEqual(['/move Gm 0 140 125', '/item 0 0', '/move Gm 0 130 120']);
  });

  it('still comes back and restores when stopped halfway', () => {
    GmPanel.runMacroAt(macro(['/item 0 0', 5000], ['/item 0 1', 0]), vars, 'Gm', home);
    vi.advanceTimersByTime(1);
    GmPanel.stopMacro();
    vi.runAllTimers();
    expect(sent).toEqual(['/hide', '/move Gm 0 140 125', '/item 0 0', '/move Gm 0 130 120', '/unhide']);
  });

  it('reads the visibility a trip still in the queue will leave, not the one it has now', () => {
    GmPanel.runMacroAt(macro(['/item 0 0', 5000]), vars, 'Gm', home);
    // The server answered the first /hide; the first trip still owes its /unhide.
    buffs.add(18);
    GmPanel.runMacroAt(macro(['/item 0 1', 0]), vars, 'Gm', home);
    vi.runAllTimers();
    expect(sent.slice(-5)).toEqual(['/hide', '/move Gm 0 140 125', '/item 0 1', '/move Gm 0 130 120', '/unhide']);
  });
});

describe('a visit (spawns, fireworks on another map)', () => {
  it('acts at once, with no hide, when standing on the tile', () => {
    GmPanel.visit('Gm', home, [{ at: home, act: () => GmPanel.sendRaw('/item 0 0') }]);
    expect(sent).toEqual(['/item 0 0']);
  });

  it('hides, goes, acts, comes back and unhides', () => {
    GmPanel.visit('Gm', home, [{ at: tile, act: () => GmPanel.sendRaw('/item 0 0') }]);
    expect(sent).toEqual(['/hide', '/move Gm 0 140 125', '/item 0 0', '/move Gm 0 130 120', '/unhide']);
  });

  it('visits several tiles in one hidden trip', () => {
    const next = { ...tile, x: 141 };
    GmPanel.visit('Gm', home, [
      { at: home, act: () => GmPanel.sendRaw('/item 0 0') },
      { at: next, act: () => GmPanel.sendRaw('/item 0 1') },
    ]);
    expect(sent).toEqual(['/item 0 0', '/hide', '/move Gm 0 141 125', '/item 0 1', '/move Gm 0 130 120', '/unhide']);
  });

  it('leaves an invisible game master invisible', () => {
    buffs.add(18);
    GmPanel.visit('Gm', home, [{ at: tile, act: () => GmPanel.sendRaw('/item 0 0') }]);
    expect(sent).toEqual(['/move Gm 0 140 125', '/item 0 0', '/move Gm 0 130 120']);
  });
});
