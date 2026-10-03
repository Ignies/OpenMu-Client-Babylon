import type { MonsterCue, MapSound, VoiceSet } from '@/controllers/sound';
import { ATTACK_EFFECT, hookOnce, hookWalk, largeLoop, smallLoop } from '../shared/sound';
import { MonsterActionType } from '@versions/shared/objects/enum';

const A = MonsterActionType;

const MAYA_HAND_SWING = { frame: [4.3, Infinity], ...ATTACK_EFFECT, channels: 1 } as const;
const MAYA_HAND: readonly MonsterCue[] = [
  // `CheckAttackTime(14)`: 13 ticks into the 0.33-speed swing
  { on: [A.Attack1], play: 'Sound/w39/maya_hand_attack-01', ...MAYA_HAND_SWING },
  { on: [A.Attack2], play: 'Sound/w39/maya_hand_attack-02', ...MAYA_HAND_SWING },
];

/**
 * `M39Kanturu3rd::MoveKanturu3rdMonsterVisual` (GM_Kanturu_3rd.cpp:788-952)
 * and `AttackEffectKanturu3rdMonster` (:1358-1476), behind `IsInKanturu3rd()`.
 */
export const KANTURU_3RD: VoiceSet = {
  // MAYA_HAND_LEFT / MAYA_HAND_RIGHT
  118: MAYA_HAND,
  119: MAYA_HAND,
  // NIGHTMARE - Attack2-4 load `nightmare_skill-0N` with no `.wav`
  // (MapManager.cpp:498-500), which never opens: silent
  121: [
    hookWalk(['Sound/w39/nightmare_idle-01', 'Sound/w39/nightmare_idle-02']),
    hookOnce([A.Attack1], 'Sound/w39/nightmare_attack-01'),
    hookOnce([A.Die], 'Sound/w39/nightmare_death'),
  ],
};

/**
 * The Kanturu tower's sound (`MapLayer.sound`), read by the sound controller.
 * No `music` row: the tower's track follows the Kanturu event state
 * (`kanturuMusic` in `controllers/sound/music.ts`).
 */
export const KANTURU_3RD_SOUND: MapSound = {
  // The Kanturu "global" loop (GM_Kanturu_3rd.cpp:192).
  beds: [{ sound: 'Sound/w39/kan_boss_global', volume: 0.4 }],
  // GM_Kanturu_3rd.cpp:120-195 (`Sound_Kanturu3rd_Object`, idle map).
  objectLoops: [
    smallLoop([25], 'Sound/w39/kan_boss_incubator', 0.3),
    smallLoop([40, 41, 42], 'Sound/w39/kan_boss_crystal', 0.3),
    smallLoop([71], 'Sound/w39/kan_boss_gear', 0.35),
    largeLoop([73], 'Sound/w39/kan_boss_field', 0.35),
  ],
  monsterCues: KANTURU_3RD,
};
