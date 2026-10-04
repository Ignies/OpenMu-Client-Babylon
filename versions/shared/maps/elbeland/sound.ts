import { MonsterActionType } from '@versions/shared/objects/enum';
import type { MapSound, VoiceSet } from '@/controllers/sound';
import {
  ATTACK_1_2,
  largeLoop,
  oneChannel,
  outsideSafeZone,
  smallLoop,
} from '../shared/sound';

const A = MonsterActionType;

/**
 * `GMNewTown::PlayMonsterSound` (GMNewTown.cpp:1110-1252); one channel each
 * (ZzzOpenData.cpp:3915-3953).
 */
const ELBELAND: VoiceSet = oneChannel({
  // RABBIT
  128: [
    { on: ATTACK_1_2, play: 'Sound/w52/SE_Mon_rabbitstrange_attack01' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_rabbitstrange_death01' },
  ],
  // BUTTERFLY
  129: [
    { on: [A.Walk], play: 'Sound/w52/SE_Mon_rabbitugly_breath01', chance: 100 },
    { on: ATTACK_1_2, play: 'Sound/w52/SE_Mon_rabbitugly_attack01' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_rabbitugly_death01' },
  ],
  // HIDEOUS_RABBIT
  130: [
    { on: [A.Stop1, A.Stop2, A.Walk], play: 'Sound/w52/SE_Mon_wolfhuman_move02', chance: 30 },
    { on: ATTACK_1_2, play: 'Sound/w52/SE_Mon_wolfhuman_attack01' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_wolfhuman_death01' },
  ],
  // WEREWOLF2
  131: [
    { on: [A.Walk], play: 'Sound/w52/SE_Mon_butterflypollution_move01', chance: 100 },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_butterflypollution_death01' },
  ],
  // CURSED_LICH
  132: [
    { on: [A.Walk], play: 'Sound/w52/SE_Mon_curserich_move01', chance: 100 },
    { on: ATTACK_1_2, play: 'Sound/w52/SE_Mon_curserich_attack01' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_curserich_death01' },
  ],
  // TOTEM_GOLEM
  133: [
    { on: [A.Walk], play: ['Sound/w52/SE_Mon_totemgolem_move01', 'Sound/w52/SE_Mon_totemgolem_move02'] },
    { on: [A.Attack1], play: 'Sound/w52/SE_Mon_totemgolem_attack01' },
    { on: [A.Attack2], play: 'Sound/w52/SE_Mon_totemgolem_attack02' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_totemgolem_death01' },
  ],
  // GRIZZLY
  134: [
    { on: [A.Walk], play: 'Sound/w52/SE_Mon_beastwoo_move01', chance: 100 },
    { on: ATTACK_1_2, play: 'Sound/w52/SE_Mon_beastwoo_attack01' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_beastwoo_death01' },
  ],
  // CAPTAIN_GRIZZLY - dies with the plain Grizzly's line, as the original does
  135: [
    { on: [A.Walk], play: 'Sound/w52/SE_Mon_beastwooleader_move01', chance: 100 },
    { on: ATTACK_1_2, play: 'Sound/w52/SE_Mon_beastwooleader_attack01' },
    { on: [A.Die], play: 'Sound/w52/SE_Mon_beastwoo_death01' },
  ],
});

/** Elbeland's sound (`MapLayer.sound`), read by the sound controller. */
export const ELBELAND_SOUND: MapSound = {
  music: 'Music/elbeland',
  // GMNewTown.cpp:193-232 (`PlayObjectSound`).
  objectLoops: [
    smallLoop([2], 'Sound/w52/SE_Obj_watersmall01', 0.35, outsideSafeZone),
    largeLoop([53], 'Sound/w52/SE_Amb_ravine01', 0.35, outsideSafeZone),
    largeLoop([56], 'Sound/w52/SE_Amb_enteratlance01', 0.35),
    largeLoop([59], 'Sound/w52/SE_Obj_waterfallsmall01', 0.4, outsideSafeZone),
    largeLoop([85], 'Sound/w52/SE_Obj_enterdevias01', 0.35),
    smallLoop([89], 'Sound/w52/SE_Obj_waterway01', 0.35, outsideSafeZone),
    largeLoop([110], 'Sound/w52/SE_Obj_villageprotection01', 0.35),
  ],
  monsterCues: ELBELAND,
};
