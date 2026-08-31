/**
 * Monster kill counters for quests — the five `m_anKillMobType /
 * m_anKillMobCount` slots of `CSQuest` that `LegacyQuestMonsterKillInfo`
 * (0xA4) fills when a quest NPC is opened mid-quest, plus a client-side
 * mirror that counts the hero's own kills between two server refreshes so
 * the window's "12 / 20" line moves as the hero fights.
 *
 * Driven by the 0xA4 packet (authoritative, replaces the mirror) and by
 * `experienceGained` (the hero landed a killing blow). Read by
 * `legacyQuests.ts` (`CheckActCondition`) and the NPC quest window.
 */
import { observable, runInAction } from 'mobx';
import { LegacyQuestMonsterKillInfoPacket } from '../common/packets/ServerToClientPackets';
import { EventBus } from '../libs/eventBus';
import { Store } from '../store';
import type { QuestLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** `QUEST_MONSTER_SLOT_COUNT`: the packet carries five monster/count pairs. */
const KILL_SLOTS = 5;

/** Monster type used for an empty slot (`SetKillMobInfo(nullptr)`). */
const EMPTY_SLOT = -1;

// ---- 2. state + readers ----------------------------------------------------

/** One `m_anKillMobType[i]` / `m_anKillMobCount[i]` pair. */
export type KillSlot = { monsterType: number; count: number };

const state = observable({
  slots: Array.from({ length: KILL_SLOTS }, (): KillSlot => ({ monsterType: EMPTY_SLOT, count: EMPTY_SLOT })),
  /** Hero kills since the last 0xA4, by monster type. */
  local: new Map<number, number>(),
});

/** `GetKillMobCount(type)`: server count plus the local mirror; 0 when untracked. */
export function legacyKillCount(monsterType: number): number {
  const slot = state.slots.find(s => s.monsterType === monsterType);
  const server = slot && slot.count >= 0 ? slot.count : 0;
  return server + (state.local.get(monsterType) ?? 0);
}

/** The five slots, for the window. */
export function legacyKillSlots(): readonly KillSlot[] {
  return state.slots;
}

/** `SetKillMobInfo`: the server's counts replace everything. */
function setKillInfo(pairs: { monsterType: number; count: number }[] | null): void {
  runInAction(() => {
    for (let i = 0; i < KILL_SLOTS; i++) {
      const pair = pairs?.[i];
      state.slots[i].monsterType = pair ? pair.monsterType : EMPTY_SLOT;
      state.slots[i].count = pair ? pair.count : EMPTY_SLOT;
    }
    state.local.clear();
  });
}

EventBus.on('LegacyQuestMonsterKillInfo', packet => {
  const p = new LegacyQuestMonsterKillInfoPacket(packet);
  if (p.Result !== 0) {
    setKillInfo(null);
    return;
  }
  const kills = p.getKills(KILL_SLOTS).map(k => ({
    monsterType: k.MonsterNumber,
    count: k.KillCount,
  }));
  setKillInfo(kills);
});

// The hero's killing blow: `experienceGained` carries the victim's net id,
// which is still in scope for the death animation.
EventBus.on('experienceGained', ({ killedNetId }) => {
  const world = Store.world;
  if (!world || killedNetId < 0) return;

  for (const entity of world.netObjsQuery) {
    if (entity.netId !== killedNetId) continue;
    const type = entity.npcType;
    if (type === undefined) return;
    runInAction(() => {
      state.local.set(type, (state.local.get(type) ?? 0) + 1);
    });
    return;
  }
});

EventBus.on('CharacterInformation', () => setKillInfo(null));

function reset(): void {
  // Counts belong to the character; only the in-scope mirror is per map.
  runInAction(() => state.local.clear());
}

// ---- 3. the layer ----------------------------------------------------------

export const killCountersLayer: QuestLayer = { name: 'killCounters', reset };
