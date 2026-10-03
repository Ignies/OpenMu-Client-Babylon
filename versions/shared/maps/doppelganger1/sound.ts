import { MonsterActionType } from '@versions/shared/objects/enum';
import type { MonsterCue, MapSound, VoiceSet } from '@/controllers/sound';
import { ATTACK_1_2, oneChannel } from '../shared/sound';

const A = MonsterActionType;

/**
 * `CGMDoppelGanger1::PlayMonsterSound` (GMDoppelGanger1.cpp:618-682); floors
 * 2-4 delegate to it unchanged.
 */
export const ICE_WALKER: readonly MonsterCue[] = [
  { on: ATTACK_1_2, play: 'Sound/w58w59/IceWalker_attack' },
  { on: [A.Walk], play: 'Sound/w58w59/IceWalker_move', chance: 20 },
  // The original borrows Elbeland's werewolf for the Ice Walker's death.
  { on: [A.Die], play: 'Sound/w52/SE_Mon_wolfhuman_death01' },
];

export const DOPPELGANGER: VoiceSet = {
  // The Ice Walker's waves are loaded with one channel (ZzzOpenData.cpp:3994-3997)
  ...oneChannel({ 145: ICE_WALKER }),
  // MAD_BUTCHER
  189: [
    { on: ATTACK_1_2, play: 'Sound/Doppelganger/Butcher_attack' },
    { on: [A.Die], play: 'Sound/Doppelganger/Butcher_death' },
  ],
  // TERRIBLE_BUTCHER
  190: [
    { on: ATTACK_1_2, play: 'Sound/Doppelganger/Angerbutcher_attack' },
    { on: [A.Die], play: 'Sound/Doppelganger/Angerbutcher_death' },
  ],
  // DOPPELGANGER - the slime speaks when it rises, not when it swings
  191: [
    { on: [A.Appear], play: 'Sound/Doppelganger/Doppelganger_attack' },
    { on: [A.Die], play: 'Sound/Doppelganger/Doppelganger_death' },
  ],
};

/**
 * The Doppelganger arenas' sound (`MapLayer.sound`), read by the sound
 * controller; floors 2-4 use this row too.
 */
export const DOPPELGANGER_SOUND: MapSound = {
  // `CGMDoppelGanger1::PlayBGM` (GMDoppelGanger1.cpp:669-693) only plays
  // while the event frame is enabled; outside it the arenas are silent.
  music: null,
  monsterCues: DOPPELGANGER,
};
