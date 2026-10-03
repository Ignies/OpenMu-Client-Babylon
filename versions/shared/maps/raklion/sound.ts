import { MonsterActionType } from '@versions/shared/objects/enum';
import type { MonsterCue, MapSound, VoiceSet } from '@/controllers/sound';
import { ATTACK_1_2, HOOK, SNOW_STEPS, oneChannel } from '../shared/sound';
import { ICE_WALKER } from '../doppelganger1/sound';

const A = MonsterActionType;

/** `CGM_Raklion::PlayMonsterSound` (GM_Raklion.cpp:2543-2717). */
const MAMMOTH: readonly MonsterCue[] = [
  { on: ATTACK_1_2, play: 'Sound/w58w59/GiantMammoth_attack' },
  { on: [A.Walk], play: 'Sound/w58w59/GiantMammoth_move', chance: 100 },
  { on: [A.Die], play: 'Sound/w58w59/GiantMammoth_death' },
];
const ICE_GIANT: readonly MonsterCue[] = [
  { on: [A.Walk], play: 'Sound/w58w59/IceGiant_move', chance: 100 },
  { on: [A.Die], play: 'Sound/w58w59/IceGiant_death' },
];
const COOLUTIN: readonly MonsterCue[] = [
  { on: ATTACK_1_2, play: 'Sound/w58w59/Coolertin_attack' },
  { on: [A.Walk], play: 'Sound/w58w59/Coolertin_move', chance: 20 },
  // Its death plays SOUND_MONSTER_HELLSPIDERDIE (GM_Raklion.cpp:2622), which
  // only the Hell Spider loads and every map change releases: silent.
];
const IRON_KNIGHT: readonly MonsterCue[] = [
  { on: ATTACK_1_2, play: 'Sound/w58w59/IronKnight_attack' },
  { on: [A.Stop1, A.Stop2, A.Walk], play: 'Sound/w58w59/IronKnight_move' },
  { on: [A.Die], play: 'Sound/death1' },
];

// One channel each (ZzzOpenData.cpp:3994-4026); the dark variants share the waves.
export const RAKLION: VoiceSet = oneChannel({
  145: ICE_WALKER,
  146: MAMMOTH,
  147: ICE_GIANT,
  148: COOLUTIN,
  149: IRON_KNIGHT,
  // SELUPAN - the Appear crack is `CGM_Raklion::MoveMonsterVisual` (:647).
  // Appear is only his skill 37 (:2482), and his word / rage / cure lines are
  // event staged or skills too: all wait on the monster skill packet (0x69).
  150: [
    { on: ATTACK_1_2, play: 'Sound/w58w59/Selupan_attack1' },
    { on: [A.Attack3], play: 'Sound/w58w59/Selupan_attack2' },
    { on: [A.Die], play: 'Sound/w58w59/Selupan_word2' },
    { on: [A.Appear], play: 'Sound/w39/maya_hand_attack-02', frame: [5.6, 6.1], ...HOOK },
  ],
  // The four dark variants reuse the plain line
  205: MAMMOTH,
  206: ICE_GIANT,
  207: COOLUTIN,
  208: IRON_KNIGHT,
});

/** Raklion's sound (`MapLayer.sound`), read by the sound controller. */
export const RAKLION_SOUND: MapSound = {
  footsteps: SNOW_STEPS,
  music: 'Music/Raklion',
  // `IsIceCity()` - Raklion and its boss room (GM_Raklion.cpp:2294-2299).
  monsterCues: RAKLION,
};
