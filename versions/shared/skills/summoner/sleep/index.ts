import { defineSkill } from '@/controllers/skills/define';
import { ALICE_SLEEP, CurseHand, aliceCurse, aliceGrace, curseHandLight, summonerHand } from '../_shared';
import { onCurseLanding, seq } from '@/controllers/skills/visuals';

const CURSE_HAND_SLEEP: CurseHand = { shiny: [0.5, 0.2, 0.8], pin: [0.7, 0, 0.8], puff: [0.6, 0.1, 0.8], dark: false };

export default defineSkill({
  id: 219,
  name: "Sleep",
  // 219 Sleep (454 Str): the violet hand FX while the clip plays; 14 ticks after the reply the violet
  // circle at the caster and the ALICE rings, flares and homing streaks on the target (aliceCurse).
  visual: {
    cast: summonerHand(CURSE_HAND_SLEEP),
    impact: onCurseLanding(aliceCurse(ALICE_SLEEP)),
    enhanced: { cast: seq(summonerHand(CURSE_HAND_SLEEP), curseHandLight(CURSE_HAND_SLEEP)), impact: onCurseLanding(seq(aliceCurse(ALICE_SLEEP), aliceGrace(ALICE_SLEEP))) },
  },
  buffs: {
    // 0x48 Sleep: violet water drops off random bones (the insert path's (0.7,0.1,0.9), WSclient.cpp:15575).
    72: () => ({ sleepDrops: { colour: [0.7, 0.1, 0.9] } }),
  },
  sound: 'Sound/SE_Ch_summoner_skill03_sleep', // Sleep
});
