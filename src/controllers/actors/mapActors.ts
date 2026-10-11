import type { PerWorld } from '@/controllers/maps';

/** `MapLayer.actors`: what a map does to the characters spawned on it. Read at spawn (`npcSpawnScale`). */
export type MapActors = {
  /** Types `from`..`to` spawn `add` bigger (`Object.Scale +=`, Setting_Monster). */
  readonly monsterScale?: PerWorld<{ readonly from: number; readonly to: number; readonly add: number }>;
};
