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

const installedAlone = (id: string) => onEmptyBus(() => MODULES.filter(m => m.id === id).forEach(m => m.install()));

describe.each([
  ['events', ['DuelStartRequest', 'MiniGameOpeningState', 'BloodCastleState', 'KanturuEnterResult', 'warpCompleted', 'wsClosed']],
  ['quests', ['LegacyQuestStateList', 'QuestStateList', 'AvailableQuests', 'OpenNpcDialog', 'CharacterInformation']],
  ['skills', ['MasterStatsUpdate', 'MasterCharacterLevelUpdate', 'ExperienceGained', 'MasterSkillList']],
  ['warp', ['AddNpcsToScope', 'requestWarp', 'wsClosed']],
])('the %s module', (id, packets) => {
  it('registers these listeners when installed', () => {
    expect([...installedAlone(id).keys()]).toEqual(expect.arrayContaining(packets));
  });
});

describe.each(MODULES.map(m => m.id))('the %s module', id => {
  it('registers its listeners when installed, not when loaded', () => {
    for (const [event, handlers] of installedAlone(id)) {
      for (const h of handlers) expect(loaded.get(event) ?? []).not.toContain(h);
    }
  });
});

describe.each(['events', 'quests'])('with %s off', id => {
  it('its packets keep the other modules\' listeners only', () => {
    const mine = installedAlone(id);
    const all = onEmptyBus(() => installModules(MODULES));
    const off = onEmptyBus(() => installModules(MODULES, m => m !== id));
    for (const [event, handlers] of mine) {
      expect(off.get(event) ?? []).toEqual((all.get(event) ?? []).filter(h => !handlers.includes(h)));
    }
  });
});
