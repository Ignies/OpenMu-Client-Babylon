import { ENUM_WORLD } from '@/core/types';
import type { MapActors } from '@/controllers/actors';

/** `BLOODCASTLE_NUM` (_define.h:260). */
const BLOODCASTLE_NUM = 8;

/**
 * Setting_Monster (ZzzCharacter.cpp:13150-13159): with `nCastle = BLOODCASTLE_NUM + world - WD_11BLOODCASTLE_END`
 * in 1..8, types 84-143 spawn `int(nCastle / 3) * 0.05` bigger: +0 on floor 1, +0.05 on 2-4, +0.1 on 5-7. The
 * master castle (52) falls outside 1..8 and keeps its scale.
 */
const growOn = (world: number): number => Math.trunc((BLOODCASTLE_NUM + world - ENUM_WORLD.WD_11BLOODCASTLE_END) / 3) * 0.05;

const FLOORS = [0, 1, 2, 3, 4, 5, 6].map(i => ENUM_WORLD.WD_11BLOODCASTLE1 + i);

export const BLOOD_CASTLE_ACTORS: MapActors = {
  monsterScale: { byWorld: Object.fromEntries(FLOORS.map(w => [w, { from: 84, to: 143, add: growOn(w) }])) },
};
