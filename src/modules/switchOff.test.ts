import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
import { EventBus } from '@/core/eventBus';
import { installModules } from './module';
import { MODULES } from './modules';

// A server may run without events or quests. Loading the modules registers none of their
// listeners; installModules registers them only for a module that is on. Listeners are compared by text.
type Bus = Map<string, string[]>;
const snapshot = (): Bus => new Map([...EventBus.all].map(([e, hs]) => [String(e), (hs as unknown[]).map(String)]));
const loaded = snapshot();

function onEmptyBus(run: () => void): Bus {
  EventBus.all.clear();
  run();
  return snapshot();
}

describe.each([
  ['quests', ['LegacyQuestStateList', 'QuestStateList', 'AvailableQuests', 'OpenNpcDialog', 'CharacterInformation']],
])('the %s module', (id, packets) => {
  const own = () => onEmptyBus(() => MODULES.filter(m => m.id === id).forEach(m => m.install()));

  it('registers its listeners when installed, not when loaded', () => {
    const mine = own();
    expect([...mine.keys()]).toEqual(expect.arrayContaining(packets));
    for (const [event, handlers] of mine) {
      for (const h of handlers) expect(loaded.get(event) ?? []).not.toContain(h);
    }
  });

  it('switched off, leaves its packets with the other modules\' listeners only', () => {
    const mine = own();
    const all = onEmptyBus(() => installModules(MODULES));
    const off = onEmptyBus(() => installModules(MODULES, m => m !== id));
    for (const [event, handlers] of mine) {
      expect(off.get(event) ?? []).toEqual((all.get(event) ?? []).filter(h => !handlers.includes(h)));
    }
  });
});
