/**
 * Monster kill counters for quests - the five `m_anKillMobType /
 * m_anKillMobCount` slots of `CSQuest` that `LegacyQuestMonsterKillInfo`
 * (0xA4) fills when a quest NPC is opened, plus a client-side mirror of the
 * hero's own kills since that snapshot so the tracker's "12 / 20" moves as
 * the hero fights.
 *
 * Driven by the 0xA4 packet (authoritative, replaces the mirror) and by
 * `ObjectGotKilled` naming the hero as the killer, which is the only kill
 * OpenMU counts (`QuestMonsterKillCountPlugIn`). Read by `legacyQuests.ts`:
 * its checks (`CheckActCondition`, `BeQuestItem`) read the slots alone, as
 * the original does, and only the display adds the mirror.
 */
import { observable, runInAction } from 'mobx';
import {
  LegacyQuestMonsterKillInfoPacket,
  ObjectGotKilledPacket,
} from '../common/packets/ServerToClientPackets';
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

/** `GetKillMobCount(type)`: the server's count at the last 0xA4; 0 when untracked. */
export function legacyServerKillCount(monsterType: number): number {
  const slot = state.slots.find(s => s.monsterType === monsterType);
  return slot && slot.count >= 0 ? slot.count : 0;
}

/** The server's count plus the hero's kills since, for display. */
export function legacyKillCount(monsterType: number): number {
  return legacyServerKillCount(monsterType) + (state.local.get(monsterType) ?? 0);
}

/** The five slots, for the window. */
export function legacyKillSlots(): readonly KillSlot[] {
  return state.slots;
}

/** Drop the mirror: the server only counts kills for a running quest. */
export function clearLocalKills(): void {
  runInAction(() => state.local.clear());
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

// `ReceiveQuestMonKillInfo` never reads the result byte, and OpenMU leaves it at 1.
EventBus.on('LegacyQuestMonsterKillInfo', packet => {
  const p = new LegacyQuestMonsterKillInfoPacket(packet);
  const kills = p.getKills(KILL_SLOTS).map(k => ({
    monsterType: k.MonsterNumber,
    count: k.KillCount,
  }));
  setKillInfo(kills);
});

EventBus.on('ObjectGotKilled', packet => {
  const p = new ObjectGotKilledPacket(packet);
  const world = Store.world;
  const hero = world?.playerEntity;
  if (!world || !hero || (p.KillerId & 0x7fff) !== hero.netId) return;

  const type = world.getByNetId(p.KilledId & 0x7fff)?.npcType;
  if (type === undefined) return;
  runInAction(() => {
    state.local.set(type, (state.local.get(type) ?? 0) + 1);
  });
});

// OpenMU resends the character information on a bulk stat add or a reset;
// only a different hero starts from empty slots (`clearQuest` in InitGame).
let heroName: string | null = null;
EventBus.on('CharacterInformation', () => {
  if (Store.playerData.name === heroName) return;
  heroName = Store.playerData.name;
  setKillInfo(null);
});

// ---- 3. the layer ----------------------------------------------------------

// Counts belong to the character, not the map: the hunt happens away from the NPC.
export const killCountersLayer: QuestLayer = { name: 'killCounters' };
